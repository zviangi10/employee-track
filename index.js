const inquirer = require('inquirer');
const { Pool } = require('pg');

const app = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'hr_db',
  password: 'annatai',
  port: 5432,
});


async function mainMenu() {
  const { choice } = await inquirer.prompt({
    name: 'choice',
    type: 'list',
    message: 'What would you like to do?',
    choices: [
      'View all departments',
      'View all roles',
      'View all employees',
      'Add a department',
      'Add a role',
      'Add an employee',
      'Update an employee role',
      'Exit'
    ],
  });
 
  switch (choice) {
    case 'View all departments':
      await viewAllDepartments();
      break;
    case 'View all roles':
      await viewAllRoles();
      break;
    case 'View all employees':
      await viewAllEmployees();
      break;
    case 'Add a department':
      await addDepartment();
      break;
    case 'Add a role':
      await addRole();
      break;
    case 'Add an employee':
      await addEmployee();
      break;
    case 'Update an employee role':
      await updateEmployeeRole();
      break;
    case 'Exit':
      console.log('Have a great day!');
      await app.end();
      return;
  }
  await mainMenu();
}

async function viewAllDepartments() {
  try {
    const res = await app.query('SELECT * FROM departments');
    console.table(res.rows);
  } catch (err) {
    console.error('Error viewing departments', err);
  }
}

async function viewAllRoles() {
  try {
    const res = await app.query(`
      SELECT r.id, r.title, d.name AS department, r.salary
      FROM roles r
      JOIN departments d ON r.department_id = d.id
    `);
    console.table(res.rows);
  } catch (err) {
    console.error('Error viewing roles', err);
  }
}

async function viewAllEmployees() {
  try {
    const res = await app.query(`
      SELECT
        e.id,
        e.first_name,
        e.last_name,
        r.title,
        d.name AS department,
        r.salary,
        CONCAT(m.first_name, ' ', m.last_name) AS manager
      FROM employees e
      LEFT JOIN roles r ON e.role_id = r.id
      LEFT JOIN departments d ON r.department_id = d.id
      LEFT JOIN employees m ON e.manager_id = m.id
    `);
    console.table(res.rows);
  } catch (err) {
    console.error('Error viewing employees', err);
  }
}

async function addDepartment() {
  const { name } = await inquirer.prompt({
    name: 'name',
    type: 'input',
    message: 'What is the name of the department?',
  });
  try {
    await app.query('INSERT INTO departments (name) VALUES ($1)', [name]);
    console.log(`Added department: ${name}`);
  } catch (err) {
    console.error('Error adding department', err);
  }
}

async function addRole() {
  const departments = await app.query('SELECT * FROM departments');
  const { title, salary, departmentId } = await inquirer.prompt([
    {
      name: 'title',
      type: 'input',
      message: 'What is the title of the role?',
    },
    {
      name: 'salary',
      type: 'input',
      message: 'What is the salary for this role?',
      validate: input => !isNaN(input) || 'Please enter a valid number',
    },
    {
      name: 'departmentId',
      type: 'list',
      message: 'Which department does this role belong to?',
      choices: departments.rows.map(dept => ({ name: dept.name, value: dept.id })),
    },
  ]);
  try {
    await app.query('INSERT INTO roles (title, salary, department_id) VALUES ($1, $2, $3)', [title, salary, departmentId]);
    console.log(`Added role: ${title}`);
  } catch (err) {
    console.error('Error adding role', err);
  }
}

async function addEmployee() {
  const roles = await app.query('SELECT * FROM roles');
  const employees = await app.query('SELECT * FROM employees');
  const { firstName, lastName, roleId, managerId } = await inquirer.prompt([
    {
      name: 'firstName',
      type: 'input',
      message: "What is the employee's first name?",
    },
    {
      name: 'lastName',
      type: 'input',
      message: "What is the employee's last name?",
    },
    {
      name: 'roleId',
      type: 'list',
      message: "What is the employee's role?",
      choices: roles.rows.map(role => ({ name: role.title, value: role.id })),
    },
    {
      name: 'managerId',
      type: 'list',
      message: "Who is the employee's manager?",
      choices: [
        { name: 'None', value: null },
        ...employees.rows.map(emp => ({ name: `${emp.first_name} ${emp.last_name}`, value: emp.id })),
      ],
    },
  ]);
  try {
    await app.query('INSERT INTO employees (first_name, last_name, role_id, manager_id) VALUES ($1, $2, $3, $4)', [firstName, lastName, roleId, managerId]);
    console.log(`Added employee: ${firstName} ${lastName}`);
  } catch (err) {
    console.error('Error adding employee', err);
  }
}

async function updateEmployeeRole() {
  const employees = await app.query('SELECT * FROM employees');
  const roles = await app.query('SELECT * FROM roles');
  const { employeeId, roleId } = await inquirer.prompt([
    {
      name: 'employeeId',
      type: 'list',
      message: 'Which employee\'s role do you want to update?',
      choices: employees.rows.map(emp => ({ name: `${emp.first_name} ${emp.last_name}`, value: emp.id })),
    },
    {
      name: 'roleId',
      type: 'list',
      message: 'Which role do you want to assign the selected employee?',
      choices: roles.rows.map(role => ({ name: role.title, value: role.id })),
    },
  ]);
  try {
    await app.query('UPDATE employees SET role_id = $1 WHERE id = $2', [roleId, employeeId]);
    console.log(`Updated employee's role`);
  } catch (err) {
    console.error('Error updating employee role', err);
  }
}

mainMenu().catch(console.error);