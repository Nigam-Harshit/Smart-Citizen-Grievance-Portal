const citizenController = require('./citizenController');

module.exports = {
    getCustomers: citizenController.getCitizens,
    getCustomerById: citizenController.getCitizenById,
    createCustomer: citizenController.createCitizen,
    updateCustomer: citizenController.updateCitizen,
    deleteCustomer: citizenController.deleteCitizen
};
