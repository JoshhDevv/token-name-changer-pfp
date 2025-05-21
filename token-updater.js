const fs = require('fs');
const axios = require('axios');
const HttpsProxyAgent = require('https-proxy-agent');

// Read configuration files
const accountLines = fs.readFileSync('accounts.txt', 'utf8')
  .split('\n')
  .filter(line => line.trim() !== '')
  .map(line => {
    const [email, password, token] = line.split(':');
    return { email, password, token };
  });

const names = fs.readFileSync('names.txt', 'utf8')
  .split('\n')
  .filter(name => name.trim() !== '');

// Read proxies
const proxies = fs.existsSync('proxies.txt') ? 
  fs.readFileSync('proxies.txt', 'utf8')
    .split('\n')
    .filter(proxy => proxy.trim() !== '') : 
  [];

const pfpFolder = './pfps'; // Folder containing profile pictures

console.log(`Loaded ${accountLines.length} accounts, ${names.length} names, ${proxies.length} proxies`);

// Get proxy for current request
function getProxy(index) {
  if (proxies.length === 0) return null;
  return proxies[index % proxies.length];
}

// Function to update username
async function updateUsername(token, newUsername, password, proxy) {
  try {
    const config = {
      method: 'PATCH',
      url: 'https://discord.com/api/v9/users/@me',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      data: {
        username: newUsername,
        password: password
      }
    };
    
    // Add proxy if available
    if (proxy) {
      config.httpsAgent = new HttpsProxyAgent(proxy);
      console.log(`Using proxy: ${proxy}`);
    }
    
    const response = await axios(config);
    return true;
  } catch (error) {
    console.error(`Failed to update username: ${error.message}`);
    return false;
  }
}

// Function to update profile picture
async function updateProfilePicture(token, imagePath, proxy) {
  try {
    const imageData = fs.readFileSync(imagePath);
    const base64Image = `data:image/png;base64,${imageData.toString('base64')}`;
    
    const config = {
      method: 'PATCH',
      url: 'https://discord.com/api/v9/users/@me',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      data: {
        avatar: base64Image
      }
    };
    
    // Add proxy if available
    if (proxy) {
      config.httpsAgent = new HttpsProxyAgent(proxy);
    }
    
    const response = await axios(config);
    return true;
  } catch (error) {
    console.error(`Failed to update profile picture: ${error.message}`);
    return false;
  }
}

// Process all accounts
async function processAccounts() {
  // Get list of profile pictures
  const pfpFiles = fs.readdirSync(pfpFolder)
    .filter(file => file.endsWith('.png') || file.endsWith('.jpg'));
  
  console.log(`Found ${pfpFiles.length} profile pictures`);
  
  for (let i = 0; i < accountLines.length; i++) {
    const { email, password, token } = accountLines[i];
    if (!token || !email || !password) {
      console.log(`Skipping invalid account at line ${i+1}`);
      continue;
    }
    
    // Get proxy for this request
    const currentProxy = getProxy(i);
    
    // Get random name and profile picture
    const name = names[Math.floor(Math.random() * names.length)];
    const pfp = pfpFiles[Math.floor(Math.random() * pfpFiles.length)];
    
    console.log(`Updating account ${i+1}/${accountLines.length}: Email: ${email} - Setting name to "${name}" and PFP to "${pfp}"`);
    
    // Update name (requires password)
    await updateUsername(token, name, password, currentProxy);
    
    // Update profile picture
    await updateProfilePicture(token, `${pfpFolder}/${pfp}`, currentProxy);
    
    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  console.log('All accounts processed!');
}

// Run the tool
processAccounts().catch(console.error);