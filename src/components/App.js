import React, { Component } from 'react'
import axios from 'axios'
import './App.css'
import NavBar from './NavBar'
import Loader from './Loader'
import Web3 from 'web3'
import Contract from '../abis/Contract'
import { create } from 'ipfs-http-client'
import CreateIdentity from './CreateIdentity'
import Identity from './Identity'
import Verifier from './Verifier'
import User from './User'
import { SyncOutlined } from '@ant-design/icons'

const ipfs = create({ host: 'ipfs.infura.io', port: '5001', protocol: 'https' })

const Api = axios.create({
  baseURL: 'http://localhost:8000/',
  responseType: 'json',
})

class App extends Component {
  constructor(props) {
    super(props)
    this.state = {
      loading: true,
      reload: false,
      error: false,
      account: null,
      balance: 0,
      authorities: [],
      role: 'user',
    }
  }

  async componentDidMount() {
    await this.getAuthorities()
    await this.loadWeb3()
    await this.loadBlockchainData()
    await this.getIdentity()
    this.setState({ loading: false })
  }

  getAuthorities = async () => {
    try {
      const { data } = await Api.get(`authority`)
      this.setState({ authorities: data })
    } catch (err) {
      console.error(err)
    }
  }

  loadWeb3 = async () => {
    if (window.ethereum) {
      window.web3 = new Web3(window.ethereum)
      await window.ethereum.enable()
    } else if (window.web3) {
      window.web3 = new Web3(window.web3.currentProvider)
    } else {
      window.alert(
        'Non-Ethereum browser detected. You should consider trying MetaMask.',
      )
    }
  }

  loadBlockchainData = async () => {
    const { web3 } = window
    const [account] = await web3.eth.getAccounts()
    const balance = web3.utils.fromWei(
      await web3.eth.getBalance(account),
      'ether',
    )
    const contractAddress = Contract.networks[5777].address
    const contract = new web3.eth.Contract(Contract.abi, contractAddress)

    this.setState(() => {
      return { account, balance, contract }
    })
  }

  getIdentity = async () => {
    const { contract, account, authorities } = this.state
    const path = await contract.methods.getIdentity().call({ from: account })
    if (!path) return this.setState({ userData: [], identity: false })
    const { data } = await axios.get(`https://ipfs.infura.io/ipfs/${path}`)
    this.setState({
      processedData: this.getProcessedData(data, authorities),
      userData: data,
      identity: true,
    })
  }

  createIdentity = async (data) => {
    const { contract, account } = this.state

    const response = await Api.post('sign', {
      attributes: data,
      userPublicKey: this.state.account,
    })
    const signedData = response.data.map(({ sign } = {}) => sign)
    const buf = Buffer.from(JSON.stringify(signedData))
    const { path } = await ipfs.add(buf)
    await contract.methods.createIdentity(path).send({ from: account })
    this.setState({ loading: true })
    await this.getIdentity()
    this.setState({ loading: false })
  }

  getProcessedData = (data, authorities = []) =>
    data.map((item) => {
      const authority = window.web3.eth.accounts.recover(item)
      const [{ AuthorityName } = {}] = authorities.filter(
        ({ PublicKey } = {}) => PublicKey === authority,
      )
      const newData = JSON.parse(item.message)
      if (authority && AuthorityName)
        return { ...newData, authorityName: AuthorityName, authority }
    })

  render() {
    const {
      loading,
      reload,
      account,
      authorities,
      identity,
      userData,
      processedData,
      role,
      contract,
      balance,
    } = this.state

    if (loading) return <Loader className="my-5" />

    return (
      <div>
        <NavBar
          name={`${parseFloat(balance)?.toFixed(6)} ETH`}
          account={account}
        />
        <div className="container-fluid mt-5 pt-5">
          <h1 className="text-center">
            <div className="d-flex justify-content-center align-items-center">
              <p className="mb-1">
                {identity ? 'Digital Identity' : 'Create Your Digital Identity'}
                &nbsp;
              </p>
              <SyncOutlined
                spin={reload}
                style={{
                  fontSize: '1.8rem',
                  marginTop: '7px',
                  cursor: 'pointer',
                }}
                onClick={async () => {
                  this.setState({ reload: true })
                  await this.getIdentity()
                  this.setState({ reload: false })
                }}
              />
            </div>
            {identity && (
              <p style={{ fontSize: '20px', fontWeight: '500' }}>{account}</p>
            )}
          </h1>
          <div className="py-2" />
          <main role="main" className="px-0">
            {identity &&
            Array.isArray(processedData) &&
            processedData.length ? (
              <>
                <Identity
                  data={processedData}
                  authorities={authorities}
                  getIdentity={this.getIdentity}
                  editIdentity={this.createIdentity}
                />
                <div className="py-2" />
                <div className="d-flex justify-content-center align-items-center">
                  <p className="m-0 h3 fw-450">Role:</p>
                  <div className="px-2" />
                  <div className="">
                    <select
                      defaultValue={role || 'user'}
                      id="role"
                      onChange={(inp) => {
                        inp && this.setState({ role: inp.target.value })
                      }}
                      className="form-control"
                      required
                    >
                      <option value="user">User</option>
                      <option value="verifier">Verifier (3rd Party)</option>
                    </select>
                  </div>
                </div>
                <div className="py-2" />
                {role === 'user' ? (
                  <User
                    contract={contract}
                    account={account}
                    data={processedData}
                    userData={userData}
                  />
                ) : (
                  <Verifier contract={contract} account={account} />
                )}
              </>
            ) : (
              <CreateIdentity
                createIdentity={this.createIdentity}
                authorities={authorities}
              />
            )}
          </main>
        </div>
      </div>
    )
  }
}

export default App
