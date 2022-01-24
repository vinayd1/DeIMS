const mongoose = require('mongoose')
const Web3 = require('web3')

const web3 = new Web3(process.env.WEB3_HOST)

const AuthoritySchema = new mongoose.Schema({
  name: String,
  private_key: { type: String, unique: true },
  public_key: { type: String, unique: true },
})

AuthoritySchema.pre('save', function (next) {
  const authority = this
  const { privateKey, address } = web3.eth.accounts.create()

  authority.private_key = privateKey
  authority.public_key = address

  next()
})

AuthoritySchema.methods.sign = function (data) {
  return web3.eth.accounts.sign(JSON.stringify(data), this.private_key)
}

module.exports = mongoose.model('Authority', AuthoritySchema)
