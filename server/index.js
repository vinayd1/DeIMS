require('dotenv').config()
const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
const Authority = require('./models/authority')

const app = express()

app.use(express.json())
app.use(
  express.urlencoded({
    extended: true,
  }),
)
app.use(cors())

const port = process.env.SERVER_PORT || 8000

app
  .post('/authority', async (req, res) => {
    const { authorityName } = req.body
    const authority = new Authority({
      name: authorityName,
    })

    try {
      const data = await authority.save()
      console.log(data)
      res.json({
        success: true,
        authorityName: data.name,
        publicKey: data.public_key,
      })
    } catch (e) {
      console.log(e)
      res.json({
        success: false,
        message: 'Something went wrong',
      })
    }
  })
  .get('/authority', async (req, res) => {
    try {
      const data = await Authority.find(
        {},
        {
          _id: 0,
          name: 1,
          public_key: 1,
        },
      ).exec()
      console.log(data)
      res.status(200).send(
        data.map(({ public_key, name }) => ({
          AuthorityName: name,
          PublicKey: public_key,
        })),
      )
    } catch (e) {
      console.log(e)
      res.json({
        success: false,
        message: 'Something went wrong',
      })
    }
  })

app.post('/sign', async (req, res) => {
  const rawData = req.body.attributes
  const userPublicKey = req.body.userPublicKey
  const signedData = []
  for (const obj of rawData) {
    const key = obj.key
    const value = obj.value
    const authority = await Authority.findOne({
      public_key: obj.authority,
    }).exec()
    signedData.push({
      sign: authority.sign({ key, value, userPublicKey }),
    })
  }
  res.status(200).send(signedData)
})
;(async () => {
  try {
    await mongoose.connect(process.env.DB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    console.log('Connected to Atlas...')
    app.listen(port, (err) => {
      if (err) {
        throw err
      } else console.log(`Server is running on port ${port}.`)
    })
  } catch (e) {
    console.log('Could not connect', e)
  }
})()
