const { response, json } = require('express')
const express = require('express')
const { v4: uuidv4 } = require('uuid')

const app = express()
app.use(express.json())

const customers = []

function verifyIfExistsAccountCPF(req, res, next) {
  const { cpf } = req.headers
  const customer = customers.find(customer => customer.cpf === cpf)
  if (!customer) {
    return res.status(400).json({ message: "Customer not found" })
  }
  req.customer = customer
  return next()
}

function getBalance(statement) {
  const balance = statement.reduce((acc, operation) => {
    if (operation.type === 'credit') {
      return acc + operation.amount
    } else {
      return acc - operation.amount
    }
  }, 0)
  return balance
}

app.post('/account', (req, res) => {
  const { cpf, name } = req.body
  const customerAlreadyExists = customers.some(customer => {
    return customer.cpf === cpf
  })
  if (customerAlreadyExists) {
    return res.status(400).json({ message: "Customer already exists." })
  }

  customers.push({
    cpf,
    name,
    id: uuidv4(),
    statement: []
  })
  return res.status(201).send()
})

app.get('/account', verifyIfExistsAccountCPF, (req, res) => {
  const { customer } = req
  return res.status(201).json(customer)
})

app.put('/account', verifyIfExistsAccountCPF, (req, res) => {
  const { customer } = req
  const { name } = req.body

  customer.name = name

  return res.status(201).send()
})

app.delete('/account', verifyIfExistsAccountCPF, (req, res) => {
  const { customer } = req

  const customerIndex = customers.indexOf(customer)
  if (!customerIndex || customerIndex === -1) {
    return res.status(400).json({ error: "delete: customer not found" })
  }
  customers.splice(customerIndex, 1)

  return res.status(200).json(customers)
})

app.get('/statement', verifyIfExistsAccountCPF, (req, res) => {
  const { customer } = req
  return res.json(customer.statement)
})

app.get('/statement/date', verifyIfExistsAccountCPF, (req, res) => {
  const { customer } = req
  const { date } = req.query

  const dateFormat = new Date(date + " 00:00")

  const statement = customer.statement.filter((statement) =>
    statement.created_at.toDateString() ===
    new Date(dateFormat).toDateString()
  )
  return res.json(statement)
})

app.post('/deposit', verifyIfExistsAccountCPF, (req, res) => {
  const { customer } = req
  const { description, amount } = req.body

  const statementOp = {
    description,
    amount,
    created_at: new Date(),
    type: 'credit'
  }
  customer.statement.push(statementOp)

  return res.status(201).send()
})

app.post('/withdraw', verifyIfExistsAccountCPF, (req, res) => {
  const { customer } = req
  const { amount } = req.body
  const balance = getBalance(customer.statement)

  if (balance < amount) {
    return res.status(400).json({ error: 'Insufficient funds.' })
  }

  const statementOp = {
    amount,
    created_at: new Date(),
    type: 'debit'
  }
  customer.statement.push(statementOp)
  return res.status(201).send()
})

app.get('/balance', verifyIfExistsAccountCPF, (req, res) => {
  const { customer } = req

  const balance = getBalance(customer.statement)

  return res.json(balance)
})

app.listen(3333)
console.log('Server running at port 3333')