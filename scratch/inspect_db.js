const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const connectDB = require('../config/db');
const User = require('../models/User');
const Citizen = require('../models/Citizen');
const Grievance = require('../models/Grievance');

async function inspect() {
    try {
        await connectDB();
        console.log('Connected to DB');

        console.log('\n--- USERS matching Rajesh ---');
        const users = await User.find({ $or: [{ name: /rajesh/i }, { email: /rajesh/i }] });
        console.log(JSON.stringify(users, null, 2));

        console.log('\n--- CITIZENS matching Rajesh ---');
        const citizens = await Citizen.find({ $or: [{ name: /rajesh/i }, { email: /rajesh/i }] });
        console.log(JSON.stringify(citizens, null, 2));

        console.log('\n--- ALL CITIZENS ---');
        const allCitizens = await Citizen.find({});
        console.log(`Total citizens in DB: ${allCitizens.length}`);
        allCitizens.forEach(c => {
            console.log(`Citizen ID: ${c._id}, Name: ${c.name}, Email: ${c.email}, LinkedUser: ${c.linkedUserId}`);
        });

        console.log('\n--- ALL GRIEVANCES & THEIR CITIZEN REFS ---');
        const grievances = await Grievance.find({});
        console.log(`Total grievances in DB: ${grievances.length}`);

        const grievanceByCitizenId = {};
        grievances.forEach(g => {
            const cid = String(g.citizenId);
            if (!grievanceByCitizenId[cid]) grievanceByCitizenId[cid] = [];
            grievanceByCitizenId[cid].push({
                _id: g._id,
                title: g.title,
                citizenName: g.citizenName,
                status: g.status
            });
        });

        console.log('\nGrievances grouped by citizenId field:');
        for (const [cid, list] of Object.entries(grievanceByCitizenId)) {
            console.log(`CitizenId (${cid}) -> Count: ${list.length}`);
            list.forEach(item => console.log(`   - [${item.status}] ${item.title} (citizenName: ${item.citizenName})`));
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

inspect();
