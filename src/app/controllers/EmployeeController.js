import Employee from '../models/Employee';

class EmployeeController {
  async index(req, res) {
    const employees = await Employee.findAll();

    return res.json(employees);
  }

  async show(req, res) {
    const { id: employee_id } = req.params;

    const employee = await Employee.findByPk(employee_id);

    return res.json(employee);
  }
}

export default new EmployeeController();
