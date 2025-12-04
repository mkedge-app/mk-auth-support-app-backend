import Employee from '../models/Employee';

class EmployeeController {
  async index(req, res) {
    try {
      const employees = await Employee.findAll();

      return res.json(employees);
    } catch (error) {
      console.error('Erro ao buscar funcionários:', error);
      return res.status(500).json({ error: 'Erro ao buscar funcionários' });
    }
  }

  async show(req, res) {
    try {
      const { id: employee_id } = req.params;

      const employee = await Employee.findByPk(employee_id);

      return res.json(employee);
    } catch (error) {
      console.error('Erro ao buscar funcionário:', error);
      return res.status(500).json({ error: 'Erro ao buscar funcionário' });
    }
  }
}

export default new EmployeeController();
