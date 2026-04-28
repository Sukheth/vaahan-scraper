importScripts("constants.js");
importScripts("getBrowserInfo.js");
importScripts("generateJWTscript.js");
importScripts("utils.js");

chrome.storage.local.get(['RM_DB_USER_EMAILID'], function(result) {
  unique_user_email = result.RM_DB_USER_EMAILID;
});
chrome.storage.local.get(['RM_DB_USER_TOKEN'], function(result) {
  rm_jwtaccess_token = result.RM_DB_USER_TOKEN;
});
let { browserName, operatingSystem} = getBrowserName();
const oktaDomain = 'https://logon.bcg.com/oauth2/aus12zg5gswCj6bF91t8';//https://bcgdev.oktapreview.com';
const clientId = '0oa12zg44hbVnGIQd1t8';
const redirectUri = `chrome-extension://jdfmbknbbofaocmpcnddjohklagooffn/callback.html`;
let codeVerifier = '';
const originalUrlTracker = new Map();
const downloadTabMap = new Map();
const potentialDownloadsMap = new Map(); // Map to link navigations to downloads
const lastProcessedUrl = new Map(); // Track last processed URL per tab to avoid duplicates
const tabLoginState = new Map(); // Track previous login state per tab to detect login changes
const isLoggedInTracked = new Map(); // Track if login has been recorded per tab
const loginRecordedTabs = new Map(); // Track tabs where login was already recorded to prevent duplicates
let lastSearchItem = '';
let lastSourceName = '';
async function authenticateUser(visitedUrl, tabId) {
  codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  const authUrl = `${oktaDomain}/v1/authorize?client_id=${clientId}&response_type=code&scope=email%20openid%20profile&redirect_uri=${redirectUri}&code_challenge=${codeChallenge}&code_challenge_method=S256&state=${encodeURIComponent(visitedUrl)}`;

  // Open the Okta authentication page in a new tab
  //chrome.tabs.create({ url: authUrl });
  chrome.tabs.update(tabId, { url: authUrl });
}
// Handle messages from the callback page (callback.html)
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.type === 'okta_code') {
    const { code, visitedUrl } = message;
      exchangeCodeForToken(code, visitedUrl, sender.tab.id);
  }
  if (message.type === 'QUERY_DOWNLOADED_SF') {
    activeTabNameSF = message.payload.activeTabName;
  }
  if (message.type === 'SEARCH_INIT_UIQ') {
    let searchItem = message.payload.searchItem;
    let sourceName = message.payload.sourceName;
    let topUrl = message.payload.topUrl;

    // Check if this is a duplicate search
    if (lastSearchItem === searchItem && lastSourceName === sourceName) {
      return; // Skip processing if same search term and source
    }
    
    // Create search record
    if (searchItem && sourceName && unique_user_email) {
      // Update last search values before making API call
      lastSearchItem = searchItem;
      lastSourceName = sourceName;
      
      let data = {
        uid: generateUid(),
        user_name: unique_user_email,
        source_type: 'search',
        source_name: sourceName,
        source_url: topUrl,
        idle_time_spent: 0,
        time_spent: 0,
        created_date: new Date(),
        browser_name: browserName,
        query_data: searchItem,
        operating_system: operatingSystem,
        page_title: pageTitleMap.get(sourceName) || sourceName
      };
      
      // Make API call
      createSourceRecord(data, sender.tab.id);
    }
  }
  
    
  if (message.type === 'QUERY_CAPTURED') {
    // Extract the query text from the message payload
    const queryText = message.payload.query;
    caseCodeValue = message.payload.caseN;
    wareHouseValue = message.payload.warehouse;
    schemaValue = message.payload.schema;
    genericQuery = queryText;

    let data = {
      uid: generateUid(),                // Unique identifier for the page view
      user_name: unique_user_email,  // User email or id
      source_type: 'snowflake_accessed',
      source_name: 'Snowflake',
      source_url: 'https://app.snowflake.com',
      idle_time_spent: 0,            // No idle time initially
      time_spent: 0,                 // No active time initially
      created_date: new Date(),       // Timestamp when tracking started
      browser_name: browserName,
      query_data: queryText,         // The query text you captured
      case_code: caseCodeValue ?? '',
      warehouse: wareHouseValue ?? '',
      schema: schemaValue ?? '',
      operating_system: operatingSystem,
      page_title: pageTitleMap.get('Snowflake') || 'Snowflake'
    };

    // Call your function to save or process this data
    createSourceRecord(data,sender.tab.id);
  }
  if(message.uq_page_title != undefined){
    let uq_page_title = message.uq_page_title;
    let uq_page_url = await isValidSource(message.page_url);
    if(uq_page_url && uq_page_url !== 'DO_NOT_TRACK'){
      if(uq_page_title !== 'Factiva'){
        pageTitleMap.set(uq_page_url,uq_page_title);
      }
      if (!pageTitleMapUpdate.has(sender.tab.id)) {
        pageTitleMapUpdate.set(sender.tab.id, new Map());
      }
      if(uq_page_title !== 'Factiva'){
        const tabMap = pageTitleMapUpdate.get(sender.tab.id);
        tabMap.set(uq_page_url, uq_page_title);
      }
    }
  }
  if(message.title_calculated != undefined){
      pageTitleMap.set('Factiva',message.title_calculated);
  }
  if(message.isUserLoggedIn != undefined){
    const previousLoginState = tabLoginState.get(sender.tab.id) ?? false;
    const newLoginState = message.isUserLoggedIn;
    
    // Update global state
    isUserLoggedIn = newLoginState;
    if(isUserLoggedIn){
      
    }else if(isUserLoggedIn === null || Object.keys(isUserLoggedIn).length === 0) {
      isUserLoggedIn = false;
    }
    if(isUserLoggedIn === 'not_found'){
      isUserLoggedIn = true;
    }
    // console.log('previousLoginState:', previousLoginState, 'newLoginState:', newLoginState, 'tabId:', sender.tab.id);
    // Detect login state change (false -> true) on same URL
    if ((previousLoginState === false && newLoginState === true && sender.tab.url) || ((previousLoginState === null || previousLoginState === undefined || 
        (typeof previousLoginState === 'object' && Object.keys(previousLoginState).length === 0) || previousLoginState === false) 
        && (newLoginState === true) && sender.tab.url.toLowerCase().includes('thundersaidenergy.com')) ) {
      tabLoginState.set(sender.tab.id, newLoginState);
      
      // Check if login was already recorded for this tab (for ANY URL on this site)
      // This prevents false positives during client-side navigation where DOM mutations
      // trigger false→true even though user was already logged in
      const loginRecord = loginRecordedTabs.get(sender.tab.id);
      const apiSourcename = await isValidSource(sender.tab.url);
      if (loginRecord) {
        // If login was recorded for same source/site, skip (just navigation, not new login)
        if (loginRecord.source_name === apiSourcename) {
          return;
        }
        // If different source, clear old record (user navigated to different site in same tab)
        loginRecordedTabs.delete(sender.tab.id);
      }
      
      // User just logged in without URL change (like celent.com)
      const isBlocked = BLOCKED_KEYWORDS.some(k => sender.tab.url.toLowerCase().includes(k.toLowerCase()));
      if (apiSourcename !== 'DO_NOT_TRACK' && unique_user_email && !isBlocked) {
        const loginUid = generateUid();
        let loginData = {
          uid: loginUid,
          user_name: unique_user_email,
          source_type: 'login',
          source_name: apiSourcename,
          source_url: sender.tab.url,
          idle_time_spent: 0,
          time_spent: 0,
          created_date: new Date(),
          browser_name: browserName,
          operating_system: operatingSystem,
          page_title: pageTitleMap.get(apiSourcename) || apiSourcename
        };
        // Set tracking BEFORE createSourceRecord to prevent race condition duplicates
        isLoggedInTracked.set(sender.tab.id, {
          loginRecorded: true,
          source_name: apiSourcename
        });
        // Mark that login is recorded for this tab+source - persists across navigation within same site
        loginRecordedTabs.set(sender.tab.id, {
          timestamp: Date.now(),
          url: sender.tab.url,
          source_name: apiSourcename
        });
        
        createSourceRecord(loginData, sender.tab.id);
        
        if(redirectChainMap.has(sender.tab.id)){
          redirectChainMap.delete(sender.tab.id);
        }
        // setTimeout(() => {  
        //   loginData.source_type = 'page_view_na';
        //   loginData.source_url = sender.tab.url+'#';
        //   createSourceRecord(loginData, sender.tab.id);
        // }, 500);
      }
    }
    // else if ((previousLoginState === null || previousLoginState === undefined || 
    //     (typeof previousLoginState === 'object' && Object.keys(previousLoginState).length === 0) || previousLoginState === false) 
    //     && (newLoginState === true) && sender.tab.url.toLowerCase().includes('thundersaidenergy.com')) {
          
    //     }
    
    // Update tracked login state for this tab only if not already updated
    // (it was already set earlier if login was detected)
    if (!tabLoginState.has(sender.tab.id) || tabLoginState.get(sender.tab.id) !== newLoginState) {
      tabLoginState.set(sender.tab.id, newLoginState);
    }
    
    // Clear login tracking if user logged out (state changed to false)
    if (newLoginState === false) {
      const loginRecord = loginRecordedTabs.get(sender.tab.id);
      if (loginRecord) {
        // loginRecordedTabs.delete(sender.tab.id);
        // isLoggedInTracked.delete(sender.tab.id);
      }
    }
  }
  if (message.action === 'navigation' && message.method === 'back_forward') {
    let uq_page_url_v = await isValidSource(message.url);
    if(uq_page_url_v && uq_page_url_v !== 'DO_NOT_TRACK'){
      isBackForwAction.set(sender.tab.id,{ action: true, last_url: message.url});
    }
  }
});
function generateCodeVerifier() {
    const randomArray = new Uint8Array(32);
    crypto.getRandomValues(randomArray); // Use crypto.getRandomValues directly in service workers
    return btoa(String.fromCharCode.apply(null, randomArray))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }
  function generateCodeChallenge(codeVerifier) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier)).then(buffer => {
      return btoa(String.fromCharCode.apply(null, new Uint8Array(buffer)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
    });
  }
// Exchange the authorization code for an access token (using PKCE)
function exchangeCodeForToken(code, visitedUrl, tabId) {
  const tokenUrl = `${oktaDomain}/v1/token`;
  fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      code: code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,  // Use the original code verifier here
    })
  })
  .then(response => response.json())
  .then(data => {
    const accessToken = data.access_token;
    getUserInfo(accessToken, visitedUrl, tabId);
  })
  .catch(error => {
    console.error('Error exchanging authorization code:', error);
  });
}
// Fetch user info from Okta after authentication
async function getUserInfo(token, visitedUrl, tabId) {
  try{
    const parts = token.split('.');
      if (parts.length === 3) {
        try {
          const payload = JSON.parse(atob(parts[1]));
          if (payload.Groups && Array.isArray(payload.Groups)) {
            if (payload.Groups.includes("UsageIQ User")) {
              unique_user_email = payload.sub;
              chrome.storage.local.set({ 'RM_DB_USER_EMAILID': unique_user_email }, function() {
                generateJWT();
              });
              // Redirect the user back to the original URL
              chrome.tabs.update(tabId, { url: visitedUrl });
            } else {
              console.log('User group does not include "User"');
            }
          }
        } catch (err) {
          console.warn('Failed to decode access token:', err);
        }
      }
  }catch(error){
    console.error('Error fetching user info:', error);
  }
}

const API_URL = 'https://api-internal.internal.production.smp-paas.com/usageiq-api/api/extension/save';
const API_URL_UPDATE = 'https://api-internal.internal.production.smp-paas.com/usageiq-api/api/extension/update';
const API_URL_VALID_SOURCE = 'https://api-internal.internal.production.smp-paas.com/usageiq-api/api/extension/fetchSourcesList';
const API_URL_SYNC_SOURCE = 'https://api-internal.internal.production.smp-paas.com/usageiq-api/api/extension/syncSource';

// const API_URL = 'https://api-protected-internal.internal.preproduction.smp-paas.com/usageiq-api/api/extension/save';
// const API_URL_UPDATE = 'https://api-protected-internal.internal.preproduction.smp-paas.com/usageiq-api/api/extension/update';
// const API_URL_VALID_SOURCE = 'https://api-protected-internal.internal.preproduction.smp-paas.com/usageiq-api/api/extension/fetchSourcesList';
// const API_URL_SYNC_SOURCE = 'https://api-protected-internal.internal.preproduction.smp-paas.com/usageiq-api/api/extension/syncSource';

// const API_URL = 'http://localhost:5001/api/extension/save';
// const API_URL_UPDATE = 'http://localhost:5001/api/extension/update';
// const API_URL_VALID_SOURCE = 'http://localhost:5001/api/extension/fetchSourcesList';
// const API_URL_SYNC_SOURCE = 'http://localhost:5001/api/extension/syncSource';

// Function to send data to DB via Node.js backend
async function createSourceRecord(data, tabId=null, isUpdate = false) {
  if(tabId){
    const originalData = originalUrlTracker.get(tabId);
    if (originalData) {
      data.original_url = originalData.originalUrl;
      data.original_source_name = originalData.originalSourceName;
      // data.original_uid = originalData.uid;
      // data.navigation_type = originalData.isManualNavigation ? 'manual' : 'redirect';
    }
  }
  
    rm_jwtaccess_token = await generateJWT();
    chrome.storage.local.get(['encryptedKey', 'savedDate'], (storedValues) => {
    const { encryptedKey, savedDate } = storedValues;
     fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${rm_jwtaccess_token}`, 
          'X-Api-Key': UIQ_X_APIKEY,
        },
        body: JSON.stringify({
          ...data,
          isUpdate,
          decryExtenKey:encryptedKey, // This will be undefined if not present, which is okay
          savedDate:savedDate,
        }),
      })
        .then((response) => response.json())
        .then((responseData) => {console.log('Data saved to DB:')
            if (responseData?.version) {
              const newVersion = responseData.version; // Version from server
              chrome.storage.local.get("activeVersion", (data) => {
                  const currentVersion = data.version; // Existing version in storage
                  if (currentVersion !== newVersion) {
                      chrome.storage.local.set({ activeVersion: newVersion }, () => {
                          fetchRecords();
                      });
                  } 
              });
            }
            const dataToSave = {};
            if (responseData?.encryptedKey) {
              dataToSave.encryptedKey = responseData.encryptedKey;
            }
            if (responseData?.savedDate) {
              dataToSave.savedDate = responseData.savedDate;
            }

            if (Object.keys(dataToSave).length > 0) {
              chrome.storage.local.set(dataToSave, () => {
              });
            }
        })
        .catch((error) => console.error('Error saving data:', error));
  });
}
async function updateSourceRecord(data, isUpdate = false) {
  rm_jwtaccess_token = await generateJWT();
  fetch(API_URL_UPDATE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${rm_jwtaccess_token}`, 
      'X-Api-Key': UIQ_X_APIKEY,
    },
    body: JSON.stringify({
      ...data,
       isUpdate: isUpdate,
    }),
  })
    .then((response) => response.json())
    .then((responseData) => {console.log('Data saved to DB:')
        if (responseData && responseData?.version) {
          const newVersion = responseData.version;
          chrome.storage.local.get("activeVersion", (data) => {
              const currentVersion = data.version;
              if (currentVersion !== newVersion) {
                  chrome.storage.local.set({ activeVersion: newVersion }, () => {
                      fetchRecords();
                  });
              } 
          });
      } 
    })
    .catch((error) => console.error('Error saving data:', error));
}
async function fetchRecords() {
    rm_jwtaccess_token = await generateJWT();
  try {
    let data = {
    };
    const response = await fetch(API_URL_VALID_SOURCE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${rm_jwtaccess_token}`, 
        'X-Api-Key': UIQ_X_APIKEY,
      },
      body: JSON.stringify({
        ...data,
      }),
    });
    const responseData = await response.json();
    const recordsMap = new Map(); 
    const domainPatterns = [];
    if (responseData.records && Array.isArray(responseData.records)) {
        // Convert records into a Map and prepare regex patterns
        responseData.records.forEach(record => {
            const domain = record.source_url.toLowerCase(); 
            recordsMap.set(domain, record.source_name);
            domainPatterns.push(domain.replace(/\./g, "\\.")); 
        });
    }
        // Create a regex pattern (case-insensitive) for quick matching
        const domainRegex = domainPatterns.length > 0 ? new RegExp(domainPatterns.join("|"), "i") : new RegExp("$^");


        // Save to Chrome Storage
        chrome.storage.local.set(
            {
                trackedSites: Array.from(recordsMap.entries()), // Convert Map to Array before storing
                domainRegex: domainRegex.source,
                activeVersion: responseData.version,
                lastUpdated: Date.now()
            },
            () => {
            }
        );
} catch (error) {
    console.error("Error fetching records:", error);
}
}
async function syncRedirectSource(data) {
    rm_jwtaccess_token = await generateJWT();
  fetch(API_URL_SYNC_SOURCE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${rm_jwtaccess_token}`, 
      'X-Api-Key': UIQ_X_APIKEY,
    },
    body: JSON.stringify({
      ...data
    }),
  })
    .then((response) => response.json())
    .then((responseData) => {
        if (responseData && responseData.version) {
          const newVersion = responseData.version; // Version from server
          chrome.storage.local.get("activeVersion", (data) => {
              const currentVersion = data.version; // Existing version in storage
              if (currentVersion !== newVersion) {
                  chrome.storage.local.set({ activeVersion: newVersion }, () => {
                      fetchRecords();
                  });
              } 
          });
      } 
    })
    .catch((error) => console.error(''));
}
// Function to check and update records after fixed interval
function checkAndUpdateRecords(canCheck) {
chrome.storage.local.get("lastUpdated", (result) => {
    if(canCheck){
      fetchRecords(); 
    }else{
      const lastUpdated = result.lastUpdated || 0;
      const duration = 14 * 60 * 1000; // 15 minutes
      const now = Date.now();
      if (now - lastUpdated > duration) {
        fetchRecords();  
      }
    }
});
}

// Fetch records when the extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
  // Get the existing data from storage
  chrome.storage.local.get(['encryptedKey', 'savedDate'], (result) => {
    // Check if the data does not exist or has empty values
    if (!result.encryptedKey && !result.savedDate) {
      // Set the default data only if not already set
      const dataToSave = {
        encryptedKey: '',
        savedDate: '',
      };
      chrome.storage.local.set(dataToSave, () => {});
    }
  });
  fetchRecords();
});

// Run the check when the browser starts
chrome.runtime.onStartup.addListener(() => {
  // Get the existing data from storage
  chrome.storage.local.get(['encryptedKey', 'savedDate'], (result) => {
    // Check if the data does not exist or has empty values
    if (!result.encryptedKey && !result.savedDate) {
      // Set the default data only if not already set
      const dataToSave = {
        encryptedKey: '',
        savedDate: '',
      };
      chrome.storage.local.set(dataToSave, () => {});
    }
  });
  checkAndUpdateRecords(true);
});

chrome.webRequest.onBeforeRequest.addListener(
  async (details) => {
    if (details.frameId === 0 && details.type === "main_frame") {
      const apiSourcename = await isValidSource(details.url);
      if(apiSourcename !== 'DO_NOT_TRACK'){
        if (!redirectSyncUrlMap.has(details.tabId)) {
            redirectSyncUrlMap.set(details.tabId, {
              sourceName: apiSourcename,
              firstUrl: details.url,
              lastUrl: details.url
            });
        }
      }
    }
  },
  { urls: ["<all_urls>"] }
);
setInterval(() => {
  checkAndUpdateRecords(false);
}, 14 * 60 * 1000); // 14m
// Track API calls using the webRequest API
chrome.webRequest.onCompleted.addListener(async function(details) {
  if (details.type === 'xmlhttprequest' || details.type === 'fetch') {
    if (details.url.includes('google')) {
      return; // Don't track the API call
    }
  }
}, {urls: ["<all_urls>"]}); // Track all API calls


//Track Downloads
chrome.downloads.onCreated.addListener((downloadItem) => {
  let tabId = downloadItem.tabId;

  // If tabId is missing, try to find it from recent navigations
  if (!tabId || tabId === -1) {
    const potentialDownload = potentialDownloadsMap.get(downloadItem.url);
    // Check if we have a recent navigation record for this URL (e.g., within the last 5 seconds)
    if (potentialDownload && (Date.now() - potentialDownload.timestamp < 5000)) {
      tabId = potentialDownload.tabId;
    }
  }

  if (tabId && tabId !== -1) {
    downloadTabMap.set(downloadItem.id, tabId);
  }
  // Clean up old entries from the potential downloads map
  potentialDownloadsMap.delete(downloadItem.url);
});

chrome.downloads.onChanged.addListener((delta) => {
  if (delta.state && delta.state.current === "complete") {
    // Generate a UID for the download event
    const downloadUid = generateUid();
    const tabId = downloadTabMap.get(delta.id); // Get the tabId here

    chrome.downloads.search({ id: delta.id }, async (results) => {
      if (results.length > 0) {
        const downloadedFile = results[0];
        let fullPath = downloadedFile.filename;
        // Check if the path contains '/' or '\'
        let filename;
        if (fullPath.includes('/') || fullPath.includes('\\')) {
          // Split by either '/' or '\' and get the last part for the filename
          filename = fullPath.split(/[/\\]/).pop();
        } else {
          // If no slashes are found, use the full path as filename (in case it's already a name)
          filename = fullPath;
        }
        let file_size = downloadedFile.fileSize;
        let sizeInMB = file_size;
        if (file_size) {
          sizeInMB = file_size / (1024 * 1024);
          if (sizeInMB < 0.01) {
            sizeInMB = sizeInMB.toFixed(4) + ' MB';
          } else {
            // Otherwise show 2 decimals
            sizeInMB = sizeInMB.toFixed(2) + ' MB';
          }
        }

        let downloadedFileName = await isValidSource(downloadedFile.url); //getSourceName(downloadedFile.url);
        let downloadedFileURL = downloadedFile.url;
        if (downloadedFileName === 'DO_NOT_TRACK') {
          downloadedFileName = await isValidSource(downloadedFile.url); //getSourceName(downloadedFile.referrer);
          downloadedFileURL = downloadedFile.referrer;
        }
        // Prepare data for the download, including file size
        let data = {
          uid: downloadUid,    // Unique identifier for the download
          user_name: unique_user_email,
          source_type: 'download',
          source_name: downloadedFileName,
          source_url: downloadedFileURL,
          download_filename: filename,
          download_filesize: file_size ? sizeInMB : 'Unknown',  // File size in MB
          time_spent: 0,       // No time spent for downloads
          created_date: new Date(),  // Current timestamp
          browser_name: browserName,
          operating_system: operatingSystem,
          page_title: pageTitleMap.get(downloadedFileName) || downloadedFileName
        };
        if (data.source_name !== 'DO_NOT_TRACK' && unique_user_email) {
          if (downloadedFileName && downloadedFileName.toLowerCase() === 'snowflake') {
            chrome.storage.local.get([activeTabNameSF], function (result) {
              if (result[activeTabNameSF]) {
                data.query_data = result[activeTabNameSF].query;
                data.case_code = result[activeTabNameSF].caseN ?? '';
                data.warehouse = result[activeTabNameSF].warehouse ?? '';
                data.schema = result[activeTabNameSF].schema ?? '';
                createSourceRecord(data, tabId);
              } else {
              }
            });
          } else {
            createSourceRecord(data, tabId);
          }
        }
        // Clean up the map entry after use
        downloadTabMap.delete(delta.id);
      }
    });
  }
});


chrome.webRequest.onBeforeRedirect.addListener(
  async function (details) {
    const apiSourcename = await isValidSource(details.url);
    
    // Original logic for redirects FROM valid sources
    if(apiSourcename !== 'DO_NOT_TRACK'){
      // Check if the redirect URL contains login-related keywords
      if (isLoginRelated(details.redirectUrl) || isLoginRelated(details.url)) {
        let tabId = details.tabId;
        let sourceName = apiSourcename;

        // Store or update the redirect chain in the Map
        redirectChainMap.set(tabId, {
          sourceName: sourceName,
          originalUrl: details.url,
          finalRedirectURL: details.redirectUrl
        });
      }
    }else{
        const apiRedirectSourcename = await isValidSource(details.redirectUrl);
        // Handle redirects TO valid sources (even from non-tracked URLs like Mimecast)
        if (apiRedirectSourcename !== 'DO_NOT_TRACK') {
            let tabId = details.tabId;
            let sourceName = apiRedirectSourcename;
            
            // Track original URL even if coming from email protection services
            if (!originalUrlTracker.has(tabId)) {
              const uid = generateUid();
              originalUrlTracker.set(tabId, {
                originalUrl: details.url,
                originalSourceName: apiSourcename !== 'DO_NOT_TRACK' ? apiSourcename : sourceName,
                uid: uid,
                timestamp: new Date(),
                isManualNavigation: true,
                redirectedFrom: details.url
              });
            }
            
            // Check if the redirect URL contains login-related keywords
            if (isLoginRelated(details.redirectUrl) || isLoginRelated(details.url)) {
              redirectChainMap.set(tabId, {
                sourceName: sourceName,
                originalUrl: details.url,
                finalRedirectURL: details.redirectUrl
              });
            }
                //syncRedirectSource(data);
          }
      }
  },
  { urls: ["<all_urls>"] }
);
// Track when a new page is loaded (only top-level pages, not frames)
chrome.webNavigation.onCompleted.addListener(async function(details) {
  if (details.frameId === 0 && details.url) {
    const visitedUrl = details.url;
    const visitedUrl2 =  await isValidSource(details.url); //getSourceName(details.url);
    if (details.url.includes('google')) {
      return; // Don't track the redirect URLS
    }
    if (visitedUrl2 !== 'DO_NOT_TRACK' && !unique_user_email && visitedUrl.indexOf("https://bcgdev.oktapreview.com/oauth2") <= -1 && visitedUrl.indexOf("https://logon.bcg.com/") <= -1) {
      // firstIdentifier = 1;
      if (visitedUrl.indexOf("bcg.com") > -1) {
        // check and get user email from API
      }else{
        authenticateUser(visitedUrl, details.tabId);
      }
    }
    // Generate a new UID for the new page view
    currentUid = generateUid();
    currentUrl = details.url;
    startTime = new Date();
    accumulatedTime = 0;  // Reset accumulated active time for the new page
    // Send the initial page view data with UID (no time spent yet)
    let data = {
      uid: currentUid,    // Unique identifier for the page view
      user_name: unique_user_email,
      source_type: 'page_view',
      source_name: visitedUrl2, //getSourceName(currentUrl),
      source_url: currentUrl,
      idle_time_spent: 0,        // No idle time initially
      time_spent: 0,       // No active time initially
      created_date: startTime,
      browser_name: browserName,
      operating_system: operatingSystem,
      page_title: pageTitleMap.get(visitedUrl2) || visitedUrl2
    };
    if (redirectSyncUrlMap.has(details.tabId) && !isLoginRelated(visitedUrl)) {
          let sName = redirectSyncUrlMap.get(details.tabId).sourceName;
          redirectSyncUrlMap.delete(details.tabId);
          let data = {
            sourceName: sName,
            sourceUrl: currentUrl,
            email: unique_user_email,
          };
          if(visitedUrl2 === 'DO_NOT_TRACK'){
            // syncRedirectSource(data);
          }
    }
    if(data.source_name !== 'DO_NOT_TRACK' && unique_user_email){
      // Check if this URL was already processed to avoid duplicates
      const lastUrl = lastProcessedUrl.get(details.tabId);
      if (lastUrl === currentUrl) {
        return;
      }
      
      if(isBackForwAction.has(details.tabId) && isBackForwAction.get(details.tabId).last_url === currentUrl){
        return;
      }else{
        isBackForwAction.delete(details.tabId);
      }
      if ((redirectChainMap.has(details.tabId) && !details.url.toLowerCase().includes('login') 
        && !details.url.toLowerCase().includes('logout'))
        || (redirectChainMap.has(details.tabId) && isUserLoggedIn === true)) {
        let redirectData = redirectChainMap.get(details.tabId);
        data.uid = generateUid();
        data.source_type = 'login';
        data.source_url = redirectData.finalRedirectURL;
        if(redirectData.sourceName === data.source_name && !redirectData.finalRedirectURL.toLowerCase().includes('logout') && isUserLoggedIn === true){
          if(isLogoutTitle(data.page_title.toLowerCase())){
            redirectChainMap.delete(details.tabId);
          }else{
            isLoginFound = true;
            if(isUserLoggedIn === true && !currentUrl.toLowerCase().includes('app.evaluate.com/ux/webreport/welcome2.aspx')){
              createSourceRecord(data,details.tabId);
            }
            redirectChainMap.delete(details.tabId);
            // Don't mark URL as processed for login - allow page_view_na to be created later
            
            // Mark that login was recorded for this tab to prevent DOM-based duplicate
            loginRecordedTabs.set(details.tabId, {
              timestamp: Date.now(),
              url: currentUrl,
              source_name: visitedUrl2
            });
          }
        }
      }
      // Track time spent on the previous URL (if any)
      firstIdentifier = 1;
      activeTabId = details.tabId;
      initializeTabState(details.tabId,currentUid); // Initialize state for new page
      const state = tabStates.get(details.tabId);
      if (state) {
        state.currentUrl = currentUrl;
        state.currentSourceName = visitedUrl2;
        state.startTime = startTime; // Set new start time
        state.uid = currentUid;
        state.accumulatedTime = 1;
      }
      setTimeout(function() {
        data.uid = currentUid;
        data.source_type = 'page_view';
        data.source_url = currentUrl;
        if(!isLoginFound && isUserLoggedIn === true && !currentUrl.toLowerCase().includes('login') 
          && !currentUrl.toLowerCase().includes('signin')){
            // Mark this URL as processed to prevent duplicates from onUpdated (only for page_view)
            lastProcessedUrl.set(details.tabId, currentUrl);
            
            let redirectDataValid1 = redirectChainMap.get(details.tabId);
            if(redirectDataValid1 && redirectDataValid1.sourceName === data.source_name && redirectDataValid1.originalUrl.toLowerCase().includes('login') && 
                redirectDataValid1.finalRedirectURL.toLowerCase().includes('login')){
                  data.source_type = 'page_view_na';
                  createSourceRecord(data,details.tabId);
            }else{
              if(isUserLoggedIn === true && !currentUrl.toLowerCase().includes('app.evaluate.com/ux/webreport/welcome2.aspx')){
                data.source_type = 'page_view';
              }else{
                data.source_type = 'page_view_na';
              }
              createSourceRecord(data,details.tabId);
            }
        }else if(isLoginFound && isUserLoggedIn === true && (redirectChainMap.has(details.tabId))){
          // Mark this URL as processed to prevent duplicates from onUpdated (only for page_view_na after login)
          lastProcessedUrl.set(details.tabId, currentUrl);
          let redirectDataValid = redirectChainMap.get(details.tabId);
          if(redirectDataValid.sourceName === data.source_name && !redirectDataValid.finalRedirectURL.toLowerCase().includes('logout')){
            data.uid = generateUid();
            data.source_type = 'login';
            if(!currentUrl.toLowerCase().includes('app.evaluate.com/ux/webreport/welcome2.aspx')){
              loginRecordedTabs.set(details.tabId, {
                  timestamp: Date.now(),
                  url: currentUrl,
                  source_name: visitedUrl2
                });
              createSourceRecord(data,details.tabId);
            }
            redirectChainMap.delete(details.tabId);
          }else{
            data.uid = currentUid;
            data.source_type = 'page_view_na';
            data.source_url = currentUrl;
            createSourceRecord(data,details.tabId);
          }
        }else{
          // Mark this URL as processed to prevent duplicates from onUpdated (for other page_view_na cases)
          lastProcessedUrl.set(details.tabId, currentUrl);
          data.uid = currentUid;
          data.source_type = 'page_view_na';
          data.source_url = currentUrl;
          createSourceRecord(data,details.tabId);
        }
        isLoginFound = false;
      }, 1000);
    }
  }
}, {url: [{schemes: ["http", "https"]}]});
// Tab Activated
chrome.tabs.onActivated.addListener((activeInfo) => {
  if(activeTabId){
    trackTimeSpent(activeTabId); // Log time for the previously active tab
  }
  activeTabId = activeInfo.tabId; // Update active tab
  const state = tabStates.get(activeTabId);
  if (state) {
    state.startTime = new Date(); // Reset start time
  }
});
// Browser Minimized or Unfocused
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    trackTimeSpent(activeTabId); // Log time for the active tab
  }else{
    const state = tabStates.get(activeTabId);
    if (state) {
      state.startTime = new Date(); // Reset start time
    }
  }
});
// Tab Removed
chrome.tabs.onRemoved.addListener((tabId) => {
  trackTimeSpent(tabId); // Log final time for the tab
  tabStates.delete(tabId); // Remove tab state
  redirectChainMap.delete(tabId);
  pageTitleMap.delete(tabId);
  isBackForwAction.delete(tabId);
  redirectSyncUrlMap.delete(tabId);
  originalUrlTracker.delete(tabId);
  lastProcessedUrl.delete(tabId); // Clean up URL tracking
  tabLoginState.delete(tabId); // Clean up login state tracking
  loginRecordedTabs.delete(tabId); // Clean up login record tracking
  isLoggedInTracked.delete(tabId);
});
function checkWindowFocus() {
  chrome.windows.getCurrent({populate: true}, (window) => {
    if (chrome.runtime.lastError) {
      return;  // Exit if there's an error
    }
    if (window && window.focused !== undefined) {
    const focused = window.focused;
    if (focused) {
      const state = tabStates.get(activeTabId);
      if (tabStates.has(activeTabId) && firstIdentifier == 0){
        firstIdentifier = 1;
        state.startTime = new Date(); // Reset start time
      }
    } else {
      // Handle window minimized logic
      if (tabStates.has(activeTabId) && firstIdentifier==1) {
        firstIdentifier = 0;
        trackTimeSpent(activeTabId);  
      }
    }
  }
  });
}
setInterval(checkWindowFocus, 1000);
// Track time spent on the current URL and update in DB
function trackTimeSpent(tabId) {
  const state = tabStates.get(tabId);
  if (state && state.startTime && state.currentUrl) {
    const apiSourcenameUpdate = state.currentSourceName;
    const currentTime = new Date();
    const elapsedTime = (currentTime - state.startTime) / 1000; 
    state.accumulatedTime += elapsedTime;
    state.startTime = null;
    let data = {
      uid: state.uid,
      time_spent: state.accumulatedTime,
      created_date: new Date(),
      ...((apiSourcenameUpdate === 'Factiva') && {
        page_title: pageTitleMap.get(apiSourcenameUpdate) || getPageTitle(tabId, apiSourcenameUpdate) || apiSourcenameUpdate
      })
    };
    
    updateSourceRecord(data); // Pass tabId to include original URL context
  }
}

// More reliable back/forward detection
chrome.webNavigation.onCommitted.addListener((details) => {
  if (details.frameId === 0) {
    const isBackForward = details.transitionQualifiers.includes('forward_back');
    
    // Clear original URL tracker for manual user actions (typed URL or bookmark)
    // BUT DON'T clear if navigating to auth/login URLs (these are automatic redirects)
    if ((details.transitionType === 'typed' || details.transitionType === 'auto_bookmark') && !isBackForward) {
      // Check if this is an authentication URL (Okta, SAML, SSO, Auth0, Azure AD, social logins, etc.)
      const url = details.url.toLowerCase();
      const isAuthUrl = url.includes('okta.com') ||
                       url.includes('auth0.com') ||
                       url.includes('login.microsoftonline.com') ||
                       url.includes('accounts.google.com') ||
                       url.includes('linkedin.com/oauth') ||
                       url.includes('saml') ||
                       url.includes('sso') ||
                       url.includes('/login') ||
                       url.includes('/signin') ||
                       url.includes('/sign-in') ||
                       url.includes('/authenticate') ||
                       url.includes('/auth/') ||
                       url.includes('/oauth') ||
                       url.includes('code=') ||
                       url.includes('state=') ||
                       url.includes('_gl=') ||
                       url.includes('session') && url.includes('redirect');
      
      if (!isAuthUrl) {
        originalUrlTracker.delete(details.tabId);
        tabStates.delete(details.tabId);
      } else {
      }
    }
    
    // Clear original URL tracker for clicked links (manual navigation)
    if (details.transitionType === 'link' && !isBackForward) {
      const currentOriginalData = originalUrlTracker.get(details.tabId);
      
      // If user clicked a link to a different domain, treat it as fresh navigation
      if (currentOriginalData) {
        try {
          const originalHostname = new URL(currentOriginalData.originalUrl).hostname;
          const newHostname = new URL(details.url).hostname;
          
          if (originalHostname !== newHostname) {
            //originalUrlTracker.delete(details.tabId);
            //tabStates.delete(details.tabId);
          } else {
          }
        } catch (e) {
          originalUrlTracker.delete(details.tabId);
          tabStates.delete(details.tabId);
        }
      }
    }
    
    if (isBackForward) {
      isBackForwAction.set(details.tabId, { action: true, last_url: details.url });
    }
  }
});
// Track original URL on first navigation - IMPROVED VERSION
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId === 0) { // Only top-level navigation
    const apiSourcename = await isValidSource(details.url);
    
    if (apiSourcename !== 'DO_NOT_TRACK') {
      // Store this navigation as a potential download initiator
      potentialDownloadsMap.set(details.url, { tabId: details.tabId, timestamp: Date.now() });

      // Set original URL only if not already tracked for this tab
      if (!originalUrlTracker.has(details.tabId)) {
        const uid = generateUid();
        originalUrlTracker.set(details.tabId, {
          originalUrl: details.url,
          originalSourceName: apiSourcename,
          uid: uid,
          timestamp: new Date(),
          isManualNavigation: true
        });
      }
    }
  }
});
// Below case is where site url donot change but internal redirects happen
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.url) {
      // Check if this URL was already processed by onCompleted to avoid duplicates
      const lastUrl = lastProcessedUrl.get(tabId);
      if (lastUrl === changeInfo.url) {
        return;
      }
      
      const apiUid = generateUid();
      const apiSourcename = await isValidSource(changeInfo.url);
      if (changeInfo.url.includes('google')) {
        return; // Don't track the redirect URLS
      }
      if (apiSourcename !== 'DO_NOT_TRACK' && unique_user_email) {
        // Generate a new UID for the new page view
        let currentUrlValues = changeInfo.url;
        startTime = new Date();
        accumulatedTime = 0;  // Reset accumulated active time for the new page
        
        // Check if previous URL in this tab was a login page
        const tabState = tabStates.get(tabId);
        const previousUrl = tabState ? tabState.currentUrl : null;
        const wasOnLoginPage = previousUrl && (
          previousUrl.toLowerCase().includes('/login') ||
          previousUrl.toLowerCase().includes('/signin') ||
          previousUrl.toLowerCase().includes('/authenticate') ||
          previousUrl.toLowerCase().includes('code=') ||
          previousUrl.toLowerCase().includes('_gl=') ||
          previousUrl.toLowerCase().includes('log-in')
      );
        
        // Check if current URL is NOT a login page
        const isNotLoginPage = !currentUrlValues.toLowerCase().includes('/login') &&
                               !currentUrlValues.toLowerCase().includes('/signin') &&
                               !currentUrlValues.toLowerCase().includes('/authenticate') &&
                               !currentUrlValues.toLowerCase().includes('code=') &&
                               !currentUrlValues.toLowerCase().includes('_gl=') &&
                               !currentUrlValues.toLowerCase().includes('log-in');
        let data = {
          uid: apiUid,    // Unique identifier for the page view
          user_name: unique_user_email,
          source_type: 'login',
          source_name: apiSourcename, //getSourceName(currentUrl),
          source_url: previousUrl ? previousUrl : currentUrlValues,
          idle_time_spent: 0,        // No idle time initially
          time_spent: 0,       // No active time initially
          created_date: startTime,
          browser_name: browserName,
          operating_system: operatingSystem,
          page_title: pageTitleMap.get(apiSourcename) || apiSourcename
        };
        
        if(isBackForwAction.has(tabId) && isBackForwAction.get(tabId).last_url === currentUrlValues){
          data.source_type = 'page_view_na';
          return;
        }else{
          isBackForwAction.delete(tabId);
        }
        
        // Handle client-side navigation from login to home (like Crunchbase)
        if (wasOnLoginPage && isNotLoginPage) {
          // First, create login entry
          setTimeout(() => {
            const urlToCheck = changeInfo.url;

             if(isUserLoggedIn === true && !urlToCheck.toLowerCase().includes('app.evaluate.com/ux/webreport/welcome2.aspx')){
              
              // Check if login was already recorded recently (prevent duplicate from DOM detection)
              const loginRecord = loginRecordedTabs.get(tabId);
              const now = Date.now();
              const alreadyRecorded = loginRecord && (now - loginRecord.timestamp) > 1;
              
              if(!isLoggedInTracked.has(tabId) && !alreadyRecorded){
                createSourceRecord(data, tabId);
              }
                // Mark that login was recorded for this tab to prevent DOM-based duplicate
                loginRecordedTabs.set(tabId, {
                  timestamp: Date.now(),
                  url: currentUrlValues,
                  source_name: apiSourcename
                });
                if(redirectChainMap.has(tabId)){
                  redirectChainMap.delete(tabId);
                }
            }else{
              const hostname = new URL(urlToCheck).hostname;
              if (hostname === 'accessanalytics.eu.broadridge.com' || hostname.includes('zoominfo.com') || hostname.includes('phocuswright.com')) {
                createSourceRecord(data, tabId);
                // Mark that login was recorded for this tab to prevent DOM-based duplicate
                loginRecordedTabs.set(tabId, {
                  timestamp: Date.now(),
                  url: currentUrlValues,
                  source_name: apiSourcename
                });
                if(redirectChainMap.has(tabId)){
                  redirectChainMap.delete(tabId);
                }
              }
            }
          }, 800);
          
          // Then, create page_view_na entry for the new page
          setTimeout(() => {
            const pageViewUid = generateUid();
            let pageViewData = {
              uid: pageViewUid,
              user_name: unique_user_email,
              source_type: 'page_view_na',
              source_name: apiSourcename,
              source_url: currentUrlValues,
              idle_time_spent: 0,
              time_spent: 0,
              created_date: new Date(),
              browser_name: browserName,
              operating_system: operatingSystem,
              page_title: pageTitleMap.get(apiSourcename) || apiSourcename
            };
            // Mark URL as processed to avoid duplicate from onCompleted
            lastProcessedUrl.set(tabId, currentUrlValues);
            createSourceRecord(pageViewData, tabId);
            
            // Update tab state
            if (tabState) {
              tabState.currentUrl = currentUrlValues;
              tabState.currentSourceName = apiSourcename;
              tabState.uid = pageViewUid;
              tabState.accumulatedTime = 0;
              tabState.startTime = new Date();
            }
          }, 1000);
          
          return;
        }
        if (tabState) {
          tabState.currentUrl = currentUrlValues;
          tabState.currentSourceName = apiSourcename;
          tabState.accumulatedTime = 0;
          tabState.uid = generateUid();
          tabState.startTime = new Date();
        }
        // Handle regular client-side navigation (not from login, not redirect chain)
        // Create page_view entry only if user is logged in AND URL actually changed (not a refresh)
        const urlChanged = previousUrl && previousUrl !== currentUrlValues;
        
        if (!wasOnLoginPage && isNotLoginPage && !redirectChainMap.has(tabId) && urlChanged) {
          const pageViewUid = generateUid();
          let pageViewData = {
            uid: pageViewUid,
            user_name: unique_user_email,
            source_type: 'page_view',
            source_name: apiSourcename,
            source_url: currentUrlValues,
            idle_time_spent: 0,
            time_spent: 0,
            created_date: new Date(),
            browser_name: browserName,
            operating_system: operatingSystem,
            page_title: pageTitleMap.get(apiSourcename) || apiSourcename
          };
          setTimeout(() => {
            if(isUserLoggedIn === true){
              // Mark URL as processed to avoid duplicate from onCompleted
              lastProcessedUrl.set(tabId, currentUrlValues);
              createSourceRecord(pageViewData, tabId);
              
              // Update tab state
              if (tabState) {
                tabState.currentUrl = currentUrlValues;
                tabState.currentSourceName = apiSourcename;
                tabState.uid = pageViewUid;
                tabState.startTime = new Date();
              }
            }else{
              pageViewData.source_type = 'page_view_na';
              createSourceRecord(pageViewData, tabId);
            }
          }, 600);
          return;
        }
        
        if ((redirectChainMap.has(tabId) && !changeInfo.url.toLowerCase().includes('login')) 
            || (redirectChainMap.has(tabId) && isUserLoggedIn === true)) {
            let redirectData = redirectChainMap.get(tabId);
            if(redirectData.sourceName === apiSourcename && !redirectData.finalRedirectURL.toLowerCase().includes('logout')
              && !redirectData.finalRedirectURL.toLowerCase().includes('signout') 
              && !redirectData.finalRedirectURL.toLowerCase().includes('signin') 
              && !redirectData.finalRedirectURL.toLowerCase().includes('login') 
            ){
                setTimeout(() => {
                  if(isLogoutTitle(data.page_title.toLowerCase())){
                    redirectChainMap.delete(tabId); // Fix: use tabId instead of details.tabId
                  }else{
                    isLoginFound = true;
                    if(isUserLoggedIn === true && !currentUrlValues.toLowerCase().includes('app.evaluate.com/ux/webreport/welcome2.aspx')){
                      const loginRecord = loginRecordedTabs.get(tabId);
                      const now = Date.now();
                      const alreadyRecorded = loginRecord && (now - loginRecord.timestamp) > 1;
                      if (!alreadyRecorded) {
                        createSourceRecord(data,tabId);
                      }
                      redirectChainMap.delete(tabId);
                      // Mark that login was recorded for this tab to prevent DOM-based duplicate
                      loginRecordedTabs.set(tabId, {
                        timestamp: Date.now(),
                        url: currentUrlValues,
                        source_name: apiSourcename
                      });
                    }
                  }
                }, 500);
            }else if(redirectData.sourceName === apiSourcename && !currentUrlValues.toLowerCase().includes('login')
              &&  !currentUrlValues.toLowerCase().includes('signin') && !redirectData.finalRedirectURL.toLowerCase().includes('logout')
              && !redirectData.finalRedirectURL.toLowerCase().includes('signout')
              && (redirectData.finalRedirectURL.toLowerCase().includes('signin') 
              || redirectData.finalRedirectURL.toLowerCase().includes('login'))
            ){
                setTimeout(() => {
                  if(isLogoutTitle(data.page_title.toLowerCase())){
                    redirectChainMap.delete(tabId); // Fix: use tabId instead of details.tabId
                  }else{
                    isLoginFound = true;
                    if(isUserLoggedIn === true){
                      const loginRecord = loginRecordedTabs.get(tabId);
                      const now = Date.now();
                      const alreadyRecorded = loginRecord && (now - loginRecord.timestamp) > 1;
                      if (!alreadyRecorded) {
                        createSourceRecord(data,tabId);
                      }
                      redirectChainMap.delete(tabId);
                      
                      // Mark that login was recorded for this tab to prevent DOM-based duplicate
                      loginRecordedTabs.set(tabId, {
                        timestamp: Date.now(),
                        url: currentUrlValues,
                        source_name: apiSourcename
                      });
                    }
                  }
                }, 500);
            }else if(redirectData.sourceName === apiSourcename && isUserLoggedIn === true && !redirectData.finalRedirectURL.toLowerCase().includes('logout')
              && !redirectData.finalRedirectURL.toLowerCase().includes('signout') 
              && !redirectData.finalRedirectURL.toLowerCase().includes('signin') 
              && !redirectData.finalRedirectURL.toLowerCase().includes('login')){
              setTimeout(() => {
                if(isLogoutTitle(data.page_title.toLowerCase())){
                  redirectChainMap.delete(tabId); // Fix: use tabId instead of details.tabId
                }else{
                  isLoginFound = true;
                  if(isUserLoggedIn === true){
                    const loginRecord = loginRecordedTabs.get(tabId);
                    const now = Date.now();
                    const alreadyRecorded = loginRecord && (now - loginRecord.timestamp) > 1;
                    
                    if (!alreadyRecorded) {
                      createSourceRecord(data,tabId);
                    }
                    redirectChainMap.delete(tabId);
                    
                    // Mark that login was recorded for this tab to prevent DOM-based duplicate
                    loginRecordedTabs.set(tabId, {
                      timestamp: Date.now(),
                      url: currentUrlValues,
                      source_name: apiSourcename
                    });
                  }
                }
              }, 500);
            }
        }
      }
  }
});

chrome.cookies.onChanged.addListener(async (changeInfo) => {
  if (changeInfo.cause === "explicit") {
      const apiSourcename = await isValidSource('https://'+changeInfo.cookie.domain);
      const cookiename = changeInfo.cookie.name;
      const cookievalue = changeInfo.cookie.value;
      if (apiSourcename !== 'DO_NOT_TRACK' && unique_user_email) {
        if(cookiename === 'LastEmailUsed' && cookievalue){
            const apiUid = generateUid();
            isLoginFound = true;

            // Find the tab associated with this cookie change to get original_url context
            let tabId = null;
            try {
              const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
              if (tabs.length > 0) {
                  const activeTab = tabs[0];
                  const tabUrl = new URL(activeTab.url);
                  // Check if the cookie domain is a subset of the tab's hostname
                  if (tabUrl.hostname.endsWith(changeInfo.cookie.domain)) {
                      tabId = activeTab.id;
                  }
                  redirectChainMap.delete(tabId);
              }
            } catch(e) {
            }

            // Generate a new UID for the new page view
            let currentUrlValues = changeInfo.cookie.domain;
            startTime = new Date();
            accumulatedTime = 0;  // Reset accumulated active time for the new page
            let data = {
              uid: apiUid,    // Unique identifier for the page view
              user_name: unique_user_email,
              source_type: 'login',
              source_name: apiSourcename, //getSourceName(currentUrl),
              source_url: currentUrlValues,
              idle_time_spent: 0,        // No idle time initially
              time_spent: 0,       // No active time initially
              created_date: startTime,
              browser_name: browserName,
              operating_system: operatingSystem,
              page_title: pageTitleMap.get(apiSourcename) || apiSourcename
            };
            createSourceRecord(data);
        }
      }
  }
});
