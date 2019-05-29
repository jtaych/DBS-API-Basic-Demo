// https://cors-anywhere.herokuapp.com/
// Debugging Section

// 1 FA - http://localhost:5500/index.html?code=BygxPZ0XNRQh6Fv4nsL5%2BFwUpAs%3D&state=0399
// 2FA - http://localhost:5500/index.html?state=null&code=DjR9y72zm9OxSwUoISDa4RDgI98%3D

// Code

//This is a function which we'll use to decode the JWT token we obtain later 

function parseJwt (token) {
  var base64Url = token.split('.')[1];
  var base64 = decodeURIComponent(atob(base64Url).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));

  return JSON.parse(base64);
}

//These set up the basic DOM functionality for the buttons on the page
document.getElementById('login-button').addEventListener('click', () => {location.href = authURL});
document.getElementById('get-token').addEventListener('click', getToken);
document.getElementById('get-parties').addEventListener('click', getParties);
document.getElementById('get-acc').addEventListener('click', getAccount);
document.getElementById('2fa').addEventListener('click', twoFA);
document.getElementById('transfer').addEventListener('click', fundTransfer);
document.getElementById('postman-btn').addEventListener('click', postman);
document.getElementById('getPoints').addEventListener('click', getPoints);

//These declare global variables that will have values stored as we call APIs
var pointBalance
var point0
var userInfo
var twoFaCode
var twoFaToken
var partyID
var accessToken
var balanceData

// !!! Load This Information Beforehand
const portNumber = 5500
const clientID = '1d7acce1-183d-42a1-afc6-8d83022562d8'
const clientSecret = '36230d45-2d3e-43d8-9d40-7c7fecfab862'
const redirectURI = `http://dbsdemo2.s3-website-ap-southeast-1.amazonaws.com/index.html`
const authURL = `https://www.dbs.com/sandbox/api/sg/v1/oauth/authorize?client_id=${clientID}&redirect_uri=${redirectURI}&scope=Read&response_type=code&state=0399`
const authCode = btoa(`${clientID}:${clientSecret}`)

// !! This pulls the authorization code from the URL  - if it exists!
let auth =  (() => {
  if((typeof (document.URL.split('=')[1])) == 'undefined') {
    return "na"
  } else {
    return (document.URL.split('=')[1]).split('&')[0]
  }
})()

//These functions govern what happens whenever the page loads

function reloadValues () {
  if ( auth === "na") {
    document.getElementById('responseTextArea').value = 'Get started by hitting DBS Login. This will redirect you (the user) to a DBS login page. Use the credentials above to log in.'
  }
  else if (typeof auth !== 'undefined') {
    document.getElementById('responseTextArea').value = `Great! Now that you've logged in, you can see the authorization code listed in the browser URL is ${auth}. The next step is to hit the Get Access Token button to call the Oauth API to exchange the authorization code for an access token`
  }
  else if ((document.URL).includes('state=null')) {
    console.log('reloaded')
    window.accessToken = localStorage.getItem('accessToken')
    window.balanceData = JSON.parse(localStorage.getItem('balanceData'))
    window.userInfo = JSON.parse(localStorage.getItem('userInfo'))
    window.userInfo = JSON.parse(localStorage.getItem('pointBalance'))
    updateHTML()
  }
}

reloadValues()

function updateHTML () {
  document.getElementById('username').innerHTML = userInfo.retailParty.retailDemographic.partyName.fullName;
  document.getElementById('user-email').innerHTML = userInfo.retailParty.contactDetl.emailDetl['0'].emailAddressDetl.emailAddressType;
  document.getElementById('birthday').innerHTML = userInfo.retailParty.retailDemographic.dateOfBirth;
  document.getElementById('occupation').innerHTML = userInfo.retailParty.employmentDetl.jobTitle;
  document.getElementById('employer').innerHTML = userInfo.retailParty.employmentDetl.employerName;
  if ((typeof balanceData !== 'undefined') && ((document.getElementById('currentRow0')) === null)) {
    for (let i = 0; i < balanceData.currentAccounts.length; i++) {
      const accountTable = document.getElementById('accountTable')
      let newTableRow = document.createElement('tr')
      newTableRow.setAttribute('id', `currentRow${i}`)
      accountTable.appendChild(newTableRow)
      let newDescriptor = document.createElement('td')
      newDescriptor.innerHTML = balanceData.currentAccounts[i].productDescription
      newTableRow.appendChild(newDescriptor)
      let newBalance = document.createElement('td')
      newBalance.innerHTML = balanceData.currentAccounts[i].balances.availableBalance.amount
      newTableRow.appendChild(newBalance)
    }
    for (let i = 0; i < balanceData.savingsAccounts.length; i++) {
      const accountTable = document.getElementById('savingsTable')
      let newTableRow = document.createElement('tr')
      newTableRow.setAttribute('id', `savingsRow${i}`)
      accountTable.appendChild(newTableRow)
      let newDescriptor = document.createElement('td')
      newDescriptor.innerHTML = balanceData.savingsAccounts[i].productDescription
      newTableRow.appendChild(newDescriptor)
      let newBalance = document.createElement('td')
      newBalance.innerHTML = balanceData.savingsAccounts[i].balances.availableBalance.amount
      newTableRow.appendChild(newBalance)
    }
  }
  if (pointBalance !== undefined) {
    for (let i = 0; i < pointBalance.cardRewardsAccounts.length; i++) {
      const accountTable = document.getElementById('cardTable')
      let newTableRow = document.createElement('tr')
      newTableRow.setAttribute('id', `card${i}`)
      accountTable.appendChild(newTableRow)
      let newDescriptor = document.createElement('td')
      newDescriptor.innerHTML = pointBalance.cardRewardsAccounts[i].cardDescription
      newTableRow.appendChild(newDescriptor)
      let newBalance = document.createElement('td')
      newBalance.innerHTML = point0[0].currentPoints
      newTableRow.appendChild(newBalance)
    }
  }
}

//This calls the Oauth API

async function getToken () {
  if (accessToken === undefined) {
    let fetchToken = {
      method: 'POST',
      body: `code=${auth}&grant_type=authorization_code&redirect_uri=${redirectURI}`,
      headers: {
        'authorization': `Basic ${authCode}`,
        'content-type': 'application/x-www-form-urlencoded',
        'cache-control': 'no-cache',
        'accept': 'application/json'
      }
    }
    let response = await fetch(`https://cors-anywhere.herokuapp.com/https://www.dbs.com/sandbox/api/sg/v1/oauth/tokens`, fetchToken)
    if (!response.ok) {
      console.log(response)
      document.getElementById('responseTextArea').value = 'Error! Your authorization code probably expired. Use the DBS Login button to log in again and obtain a new authorization code'
    } else {
      let parsed = await response.json()
      console.log(parsed)
      window.accessToken = parsed.access_token
      let tokenObj = parseJwt(parsed.access_token)
      console.log(tokenObj)
      window.partyID = tokenObj.cin
      document.getElementById('responseTextArea').value = `By calling the Oauth API, you've received the Access Token ${accessToken}. You can decode this JWT token to obtain the PartyID of this user, which is ${partyID}. You can check them both out in the console! Armed with this information, we can start by calling the Parties API. Hit the Get Parties Info button to do that!`
    }
  }
}

//This uses the access token we received in the previous step to call the Parties API

async function getParties() {
  let fetchbalanceData = {
    method: 'GET',
    headers: {
      'accessToken': accessToken,
      'clientID': clientID,
      'accept': 'application/json'
    }
  }
  console.log(partyID)
  let partyStream = await fetch(
    `https://cors-anywhere.herokuapp.com/https://www.dbs.com/sandbox/api/sg/v2/parties/${partyID}`, fetchbalanceData
  )
  let partyObj = await partyStream.json()
  console.log(partyObj)
  window.userInfo = partyObj
  updateHTML()
  document.getElementById('responseTextArea').value = `The Parties API contains customer information which can be used to autofill forms. You can check out the body of the Parties API response and all the relevant data fields it includes in the console! I've used the information to populate some of the fields on the right`
}

//Call the Deposits API to get their bank account information

async function getAccount () {
  let fetchAcc = {
    method: 'GET',
    headers: {
      'accessToken': accessToken,
      'clientId': clientID,
      'content-type': 'application/json'
      // "uuid": "24516bf8-cd2b-4e21-ba85-7a89c670dc7c",
    }
  }
  const response = await fetch(`https://cors-anywhere.herokuapp.com/https://www.dbs.com/sandbox/api/sg/v1/parties/${partyID}/deposits`, fetchAcc)
  window.balanceData = await response.json()
  console.log(balanceData)
  // console.log(balanceData.currentAccounts.length)
  updateHTML()
  document.getElementById('responseTextArea').value = `The Deposits API contains information about what bank accounts a user has, and what the balances are for each account. You can check out the body of the Deposits API response and all the relevant data fields it includes in the console! I've used the information to populate some of the fields on the right`
}

async function postman () {
  let fetchfx = {
    method: 'GET',
    headers: {
      'accessToken': accessToken,
      'clientId': clientID,
      'content-type': 'application/json'
      // "uuid": "24516bf8-cd2b-4e21-ba85-7a89c670dc7c",
    }
  }
  const response = await fetch(`https://cors-anywhere.herokuapp.com/https://www.dbs.com/sandbox/api/sg/v1/rates/exchangeRates?rateType=boardRate&quoteCurrency=INR&boardRateType=Telegraphic%20Transfer&baseCurrency=SGD`, fetchfx)
  const fxRate = await response.json()
  console.log(fxRate)
}

function saveValues () {
  console.log(accessToken)
  localStorage.setItem('accessToken', accessToken)
  localStorage.setItem('balanceData', JSON.stringify(balanceData))
  localStorage.setItem('userInfo', JSON.stringify(userInfo))
  localStorage.setItem('userInfo', JSON.stringify(pointBalance))
}

async function twoFA () {
  saveValues()
  let twoFaPayload = {
    method: 'POST',
    headers: {
      'accessToken': accessToken,
      'clientId': clientID,
      'content-type': 'application/json'
    },
    'fundTransferDetl': {
      'debitAccountId': balanceData.currentAccounts['0'].id,
      'creditAccountId': balanceData.currentAccounts['1'].id,
      'amount': 10
    }
  }
  console.log(balanceData.currentAccounts['0'].id)
  const response = await fetch('https://cors-anywhere.herokuapp.com/https://www.dbs.com/sandbox/api/sg/v1/transfers/adhocTransfer', twoFaPayload)
  const ftResult = await response.json()
  const codeInterim = (ftResult.Error.url).split('=')[1] + '=' + (ftResult.Error.url).split('=')[2]
  location.href = `https://www.dbs.com/sandbox/api/sg/v1/access/authorize?code=${codeInterim}&client_id=${clientID}&redirect_uri=${redirectURI}`
}



async function fundTransfer () {
  // Fetch 2Fa Token
  window.twoFaCode = (document.URL).split('=')[2]
  let fetchToken = {
    method: 'POST',
    body: `code=${twoFaCode}&grant_type=authorization_code&redirect_uri=${redirectURI}`,
    headers: {
      'authorization': `Basic ${authCode}`,
      'content-type': 'application/x-www-form-urlencoded',
      'cache-control': 'no-cache',
      'accept': 'application/json'
    }
  }
  let response = await fetch(`https://cors-anywhere.herokuapp.com/https://www.dbs.com/sandbox/api/sg/v1/oauth/tokens`, fetchToken)
  let parse = await response.json()
  window.twoFaToken = parse.access_token
  console.log(twoFaToken)
  // Update the balanceID
  /* let fetchbalanceData = {
    method: 'GET',
    headers: {
      'accessToken': accessToken,
      'clientID': clientID,
      'accept': 'application/json'
    }
  }
  const newBalanceDataRes = await fetch(
    `https://cors-anywhere.herokuapp.com/https://www.dbs.com/sandbox/api/sg/v1/parties/${partyID}/deposits`, fetchbalanceData
  )
  const newBalanceData = await newBalanceDataRes.json()
  console.log(newBalanceData) */
  // Initiate the fund transfer
  let ftPayload = {
    method: 'POST',
    headers: {
      'accessToken': twoFaToken,
      'clientId': clientID,
      'uuid': '7455d1e3-954e-4fe0-b478-baeeb9125e19'
      // '_ELEVATION': '3'
    },
    body: {
      'fundTransferDetl': {
        // 'debitAccountId': balanceData.currentAccounts[0].id,
        // 'debitAccountId': (balanceData.currentAccounts[0].id).toString(),
        // 'debitAccountId': 'abc123helloworld src=jackiechanwtf.png',
        'debitAccountId': '01970000890005',
        'creditAccountNumber': '123456',
        'amount': 11,
        'comments': ' ',
        'purpose': ' ',
        'transferType': 'INSTANT',
        'valueDate': '2018-09-13',
        'partyId': partyID,
        'referenceId': 'reference-id-123'
      }
    }
  }
  response = await fetch('https://cors-anywhere.herokuapp.com/https://www.dbs.com/sandbox/api/sg/v1/transfers/adhocTransfer', ftPayload)
  console.log(response)
  const ftResponse = await response.json()
  console.log(ftResponse)
}

async function getPoints () {
  // console.log(`${clientID},${accessToken},${partyID}`)
  let fetchPts = {
    method: 'GET',
    headers: {
      'accessToken': accessToken,
      'clientId': clientID,
      'content-type': 'application/json'
      // "uuid": "24516bf8-cd2b-4e21-ba85-7a89c670dc7c",
    }
  }
  const response = await fetch(`https://cors-anywhere.herokuapp.com/https://www.dbs.com/sandbox/api/sg/v1/parties/${partyID}/rewards`, fetchPts)
  console.log(response)
  window.pointBalance = await response.json()
  console.log(pointBalance)
  await getPointBalance()
  updateHTML()
}

async function getPointBalance () {
  let fetchPts = {
    method: 'GET',
    headers: {
      'accessToken': accessToken,
      'clientId': clientID,
      'content-type': 'application/json'
    }
  }
  /* for (let i = 0; i< pointBalance.length; i++) {
    var toString('card'+ i ) = pointBalance.cardRewardsAccounts[i].rewardsSchemes[0].id
  } */
  const response = await fetch(`https://cors-anywhere.herokuapp.com/https://www.dbs.com/sandbox/api/sg/v1/rewards/${pointBalance.cardRewardsAccounts[0].rewardsSchemes[0].id}/points`, fetchPts)
  window.point0 = await response.json()
  console.log(point0)
}

/* 'fundTransferDetl': {
        'debitAccountId': balanceData.currentAccounts[0].id,
        'creditAccountId': balanceData.currentAccounts[1].id,
        // 'creditAccountId': 123456789
        'amount': 10
      } */

/*
async function getTransactions () {
  let txnPayload = {
    method: 'GET',
    headers: {
      'accessToken': accessToken,
      'clientId': clientID,
      'content-type': 'application/json'
    }
  }
  const res = await fetch(`https://cors-anywhere.herokuapp.com/https://www.dbs.com/sandbox/api/sg/v1/accounts/${balanceData.savingsAccounts[1].id}/transactions?startDate=2017-11-22&endDate=2018-02-23`, txnPayload)
  console.log(res)
  const txnData = await res.json()
  console.log(txnData)
}
*/
