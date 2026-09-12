const User = require('../models/User');
const Citizen = require('../models/Citizen');
const Grievance = require('../models/Grievance');
const GrievanceUpdate = require('../models/GrievanceUpdate');
const Insight = require('../models/Insight');

/**
 * Resolves the canonical Citizen profile for a given user or citizen ID / email.
 * Ensures 1 real citizen -> 1 canonical Citizen identity.
 */
const getCanonicalCitizen = async ({ userId, citizenId, email, name, phone, address }) => {
    let citizen = null;

    // 1. Try by userId
    if (userId) {
        citizen = await Citizen.findOne({ linkedUserId: userId });
    }

    // 2. Try by citizenId
    if (!citizen && citizenId) {
        citizen = await Citizen.findById(citizenId);
        if (!citizen) {
            // Check if citizenId was actually a User ID
            citizen = await Citizen.findOne({ linkedUserId: citizenId });
        }
    }

    // 3. Try by email
    if (!citizen && email) {
        citizen = await Citizen.findOne({ email: email.toLowerCase().trim() });
    }

    // If still no citizen profile and we have basic info, create canonical Citizen profile
    if (!citizen && (email || userId)) {
        let userDoc = null;
        if (userId) {
            userDoc = await User.findById(userId);
        } else if (email) {
            userDoc = await User.findOne({ email: email.toLowerCase().trim() });
        }

        const citizenEmail = email || (userDoc ? userDoc.email : '');
        const citizenName = name || (userDoc ? userDoc.name : 'Citizen');
        const citizenContact = phone || (userDoc ? userDoc.phone : '');

        citizen = await Citizen.create({
            name: citizenName,
            email: citizenEmail.toLowerCase().trim(),
            contact: citizenContact,
            address: address || '',
            linkedUserId: userDoc ? userDoc._id : (userId || undefined),
            status: 'Active'
        });
    }

    // Ensure bi-directional link if user exists
    if (citizen) {
        let userDoc = null;
        if (userId) {
            userDoc = await User.findById(userId);
        } else if (citizen.linkedUserId) {
            userDoc = await User.findById(citizen.linkedUserId);
        } else if (citizen.email) {
            userDoc = await User.findOne({ email: citizen.email.toLowerCase().trim() });
        }

        let updated = false;
        if (userDoc) {
            if (String(citizen.linkedUserId) !== String(userDoc._id)) {
                citizen.linkedUserId = userDoc._id;
                updated = true;
            }
            if (String(userDoc.linkedCitizenId) !== String(citizen._id)) {
                userDoc.linkedCitizenId = citizen._id;
                await userDoc.save();
            }
        }
        if (updated) {
            await citizen.save();
        }
    }

    return citizen;
};

/**
 * Returns all citizen IDs and user IDs associated with a citizen's email/identity.
 */
const getAllAssociatedIds = async (citizenOrUserId) => {
    if (!citizenOrUserId) return [];

    let citizen = await Citizen.findById(citizenOrUserId);
    let user = await User.findById(citizenOrUserId);

    if (!citizen && user) {
        citizen = await Citizen.findOne({ linkedUserId: user._id }) || await Citizen.findOne({ email: user.email });
    }
    if (!user && citizen && citizen.linkedUserId) {
        user = await User.findById(citizen.linkedUserId);
    }
    if (!user && citizen && citizen.email) {
        user = await User.findOne({ email: citizen.email });
    }

    const email = (citizen ? citizen.email : user ? user.email : '').toLowerCase().trim();

    const relatedCitizens = email
        ? await Citizen.find({ email })
        : citizen ? [citizen] : [];

    const ids = new Set();
    if (citizen) ids.add(String(citizen._id));
    if (user) ids.add(String(user._id));

    relatedCitizens.forEach(c => {
        ids.add(String(c._id));
        if (c.linkedUserId) ids.add(String(c.linkedUserId));
    });

    return Array.from(ids);
};

/**
 * Database Migration & Cleanup Utility.
 * Merges duplicate Citizen records with matching emails into 1 canonical Citizen record.
 * Re-points all grievances, updates, and insights to the canonical Citizen ID.
 */
const consolidateCitizenIdentities = async () => {
    try {
        const allCitizens = await Citizen.find();
        const citizensByEmail = {};

        allCitizens.forEach(c => {
            if (!c.email) return;
            const normEmail = c.email.toLowerCase().trim();
            if (!citizensByEmail[normEmail]) citizensByEmail[normEmail] = [];
            citizensByEmail[normEmail].push(c);
        });

        for (const [email, group] of Object.entries(citizensByEmail)) {
            // Find corresponding User account if exists
            const user = await User.findOne({ email });

            // Sort group so the one linked to user or with most info comes first
            group.sort((a, b) => {
                if (user && String(a.linkedUserId) === String(user._id)) return -1;
                if (user && String(b.linkedUserId) === String(user._id)) return 1;
                return a.createdAt - b.createdAt;
            });

            const canonicalCitizen = group[0];
            const duplicateCitizens = group.slice(1);

            // Ensure canonical citizen links to user
            if (user) {
                canonicalCitizen.linkedUserId = user._id;
                await canonicalCitizen.save();

                if (String(user.linkedCitizenId) !== String(canonicalCitizen._id)) {
                    user.linkedCitizenId = canonicalCitizen._id;
                    await user.save();
                }
            }

            const allGroupIds = group.map(c => c._id);
            if (user) allGroupIds.push(user._id);

            // 1. Re-point all grievances belonging to any ID in allGroupIds (or with matching citizen email) to canonicalCitizen._id
            await Grievance.updateMany(
                { citizenId: { $in: allGroupIds } },
                { $set: { citizenId: canonicalCitizen._id, citizenName: canonicalCitizen.name } }
            );

            // 2. Re-point insights
            await Insight.updateMany(
                { citizenId: { $in: allGroupIds } },
                { $set: { citizenId: canonicalCitizen._id } }
            );

            // 3. Remove duplicate Citizen records
            for (const dup of duplicateCitizens) {
                await Citizen.findByIdAndDelete(dup._id);
            }
        }

        // Also check for grievances where citizenId is a User ID that wasn't caught above
        const grievances = await Grievance.find();
        for (const g of grievances) {
            const citizenExists = await Citizen.findById(g.citizenId);
            if (!citizenExists) {
                // Try to find User by this ID
                const userDoc = await User.findById(g.citizenId);
                if (userDoc) {
                    const canonical = await getCanonicalCitizen({ userId: userDoc._id, email: userDoc.email, name: userDoc.name });
                    if (canonical) {
                        g.citizenId = canonical._id;
                        g.citizenName = canonical.name;
                        await g.save();
                    }
                }
            }
        }
    } catch (err) {
        console.error('Error consolidating citizen identities:', err);
    }
};

module.exports = {
    getCanonicalCitizen,
    getAllAssociatedIds,
    consolidateCitizenIdentities
};
