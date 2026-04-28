// Function to generate a unique identifier (UID) for each event
function generateUid() {
    return 'uid-' + Math.random().toString(36).substr(2, 11) + '-' + Date.now();
  }
  // Function to initialize tab state
  function initializeTabState(tabId, uidd) {
    if (!tabStates.has(tabId)) {
      tabStates.set(tabId, {
        currentUrl: null,
        currentSourceName:null,
        startTime: null,
        accumulatedTime: 0,
        idleTime: 0,
        uid: uidd,
      });
    }
  }
function isValidSource(sourceURL) {
    return new Promise((resolve) => {
        chrome.storage.local.get(["trackedSites", "domainRegex"], async (result) => {
            if (result.trackedSites && result.domainRegex) {
                const recordsMap = new Map(result.trackedSites);
                const regexPattern = new RegExp(result.domainRegex, "i"); // Case-insensitive regex
  
                try {
                    let hostname;
                    let fullPath;
                    let fullUrl;
                    
                    // Handle blob URLs
                    if (sourceURL.startsWith("blob:") || sourceURL.startsWith("view-source:") || sourceURL.startsWith("filesystem:") ||
                         sourceURL.startsWith("data:")) {
                        const blobUrl = sourceURL.substring(sourceURL.indexOf(":") + 1);
                        const parsedUrl = new URL(blobUrl);
                        hostname = parsedUrl.hostname;
                        fullPath = parsedUrl.hostname + parsedUrl.pathname;
                        fullUrl = parsedUrl.hostname + parsedUrl.pathname + parsedUrl.search;
                    } else {
                        const parsedUrl = new URL(sourceURL);
                        hostname = parsedUrl.hostname;
                        fullPath = parsedUrl.hostname + parsedUrl.pathname;
                        fullUrl = parsedUrl.hostname + parsedUrl.pathname + parsedUrl.search;
                    }

                    hostname = hostname.toLowerCase().replace(/^www\./, "");
                    fullPath = fullPath.toLowerCase().replace(/^www\./, "");
                    fullUrl = fullUrl.toLowerCase().replace(/^www\./, "");
                    
                    // Remove trailing slash for consistent matching
                    if (fullPath.endsWith('/') && fullPath.length > 1) {
                        fullPath = fullPath.slice(0, -1);
                    }

                    // Sort domains by specificity (longer paths first) to ensure most specific match
                    const sortedDomains = Array.from(recordsMap.entries())
                        .sort((a, b) => b[0].length - a[0].length);

                    // Check for matches in order of specificity
                    for (const [domain, sourceName] of sortedDomains) {
                        let normalizedDomain = domain.toLowerCase();
                        
                        // Remove trailing slash for consistent comparison
                        if (normalizedDomain.endsWith('/') && normalizedDomain.length > 1) {
                            normalizedDomain = normalizedDomain.slice(0, -1);
                        }
                        
                        // Enhanced matching logic
                        if (normalizedDomain.includes('/')) {
                            // Check for exact URL match (with query parameters)
                            if (normalizedDomain.includes('?') && fullUrl.startsWith(normalizedDomain)) {
                                resolve(sourceName);
                                return;
                            }
                            
                            // Check for path match (without query parameters)
                            if (!normalizedDomain.includes('?')) {
                                if (fullPath.startsWith(normalizedDomain) || 
                                    (fullUrl.includes('?') && fullUrl.split('?')[0] === normalizedDomain)) {
                                    resolve(sourceName);
                                    return;
                                }
                            }
                        }
                        
                        // Check for exact hostname match (only if domain doesn't contain path)
                        if (!normalizedDomain.includes('/') && hostname === normalizedDomain) {
                            resolve(sourceName);
                            return;
                        }
                        
                        // Check for subdomain match (only for hostname-only domains)
                        if (!normalizedDomain.includes('/')) {
                            const domainRegex = new RegExp(
                                `^(.*\\.)?${normalizedDomain.replace(/\./g, '\\.')}$`,
                                'i'
                            );
                            if(domainRegex.test(hostname)){
                                resolve(sourceName);
                                return;
                            }
                        }
                    }
                    
                    resolve("DO_NOT_TRACK");
                } catch (e) {
                    resolve("DO_NOT_TRACK");
                }
            }else if (!result.trackedSites || !result.domainRegex) {
                await fetchRecords();
                return resolve(isValidSource(sourceURL));
            } else {
                resolve("DO_NOT_TRACK");
            }
        });
    });
  }
  // Function to check if a URL contains login-related keywords
function isLoginRelated(url) {
    return LOGIN_KEYWORDS.some(keyword => url.toLowerCase().includes(keyword));
}
function isLogoutTitle(url) {
    return LOGOUT_TITLE.some(keyword => url.toLowerCase().includes(keyword));
}
function isAuthenticatedRelated(url) {
    return AUTH_KEYWORDS.some(keyword => url.toLowerCase().includes(keyword));
}
function isDashboardRelated(url) {
    return HOME_PAGE_KEYWORDS.some(keyword => url.toLowerCase().includes(keyword));
}
function isOnlyBaseUrl(url) {
    try {
        const parsedUrl = new URL(url.includes('://') ? url : 'https://' + url); // Ensure valid URL
        return parsedUrl.pathname === '/' && !parsedUrl.search && !parsedUrl.hash;
    } catch (error) {
        return false; // Invalid URL case
    }
}
// Get value
function getPageTitle(tab_id, uq_page_url) {
    const tabMap = pageTitleMapUpdate.get(tab_id);
    return tabMap?.get(uq_page_url) || uq_page_url;
  }