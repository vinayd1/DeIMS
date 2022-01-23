require('dotenv').config()
const express = require('express')
const cors = require('cors')
const Web3 = require('web3')
const app = express()
const mysql = require('mysql')

app.use(express.json())
app.use(
  express.urlencoded({
    extended: true,
  }),
)
app.use(cors())

const port = 8000
const web3 = new Web3(process.env.WEB3_HOST)
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
}

const sqlQueryAsPromised = async (query) =>
  new Promise((res, rej) => {
    connection.query(query, (err, data) => {
      if (err) rej(err)
      res(data)
    })
  })

const connection = mysql.createConnection(dbConfig)
const sqlTableQueries = {
  createAuthoritiesTable:
    'Create table if not exists Authority(AuthorityName varchar(100),PrivateKey varchar(100),PublicKey varchar(100));',
}

connection.connect(() => {
  console.log('<<<<Connected to mySQL database>>>>')
  connection.query(sqlTableQueries.createAuthoritiesTable, (err) => {
    if (err) throw err
  })
  app.listen(port, (err) => {
    if (err) {
      throw err
    } else console.log(`Server is running on port ${port}.`)
  })
})

app
  .post('/authority', async (req, res) => {
    const details = req.body
    const authorityWallet = web3.eth.accounts.create()
    try {
      await sqlQueryAsPromised(`Insert into Authority(AuthorityName,PrivateKey,PublicKey) 
      values('${details.authorityName.replace(';', '')}', '${
        authorityWallet.privateKey
      }','${authorityWallet.address}');`)
      res.status(200).send({ identity: authorityWallet.address })
    } catch (err) {
      res.status(500).send(err)
    }
  })
  .get('/authority', async (req, res) => {
    try {
      const data = await sqlQueryAsPromised(
        `Select AuthorityName, PublicKey from Authority`,
      )
      res.status(200).send(data)
    } catch (err) {
      res.status(500).send(err)
    }
  })

app.post('/sign', async (req, res) => {
  console.log(req.body)
  const rawData = req.body.attributes
  const userPublicKey = req.body.userPublicKey
  const signedData = []

  for (const obj of rawData) {
    const authority = obj.authority
    const key = obj.key
    const value = obj.value
    const [{ PrivateKey: privateKey }] = await sqlQueryAsPromised(
      `Select PrivateKey from Authority where PublicKey='${authority}';`,
    )

    const data = {
      key,
      value,
      userPublicKey,
    }

    signedData.push({
      sign: web3.eth.accounts.sign(JSON.stringify(data), privateKey),
    })
  }

  res.status(200).send(signedData)
})
