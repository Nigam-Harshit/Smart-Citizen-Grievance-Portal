const grievanceController = require('./grievanceController');

module.exports = {
    getReports: grievanceController.getGrievances,
    createReport: grievanceController.createGrievance,
    updateReport: grievanceController.updateGrievance,
    generateInsights: grievanceController.generateInsights,
    getInsights: grievanceController.getInsights
};
