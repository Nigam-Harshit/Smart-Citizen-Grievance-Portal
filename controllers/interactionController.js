const grievanceUpdateController = require('./grievanceUpdateController');

module.exports = {
    getInteractions: grievanceUpdateController.getUpdatesByGrievance,
    createInteraction: grievanceUpdateController.createUpdate
};
