import Employee from '../models/Employee';

class EmployeeController {
  async index(req, res) {
    const employees = await Employee.findAll();

    return res.json(employees);
  }
}

export default new EmployeeController();
