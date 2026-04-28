let idleTimeout = 60000; // 60 sec threshold for idle detection (in milliseconds)
let idleStartTime = null;
let isIdle = false;
let userValueCheck = null; 
let isFirstLoad = true;
let lastUrl = location.href;

chrome.storage.local.get(['RM_DB_USER_EMAILID'], function(result) {
    userValueCheck = result.RM_DB_USER_EMAILID;
  });
  let topUrl = window.location.origin;
 chrome.runtime.sendMessage({ uq_page_title: document.title ,page_url: topUrl}); 
async function isUserLoggedInFunc() {
    const apiSourcename = await isValidOpenSource(topUrl);
    if(apiSourcename !== 'DO_NOT_TRACK'){
        chrome.runtime.sendMessage({ uq_page_title: document.title ,page_url: topUrl});
        // Check for ZoomInfo user menu (zic-topbar-user-menu pattern)
        const hasLoginForm = detectLoginForm();
        const hasPasswordField = detectPasswordFields();
        if (hasLoginForm && hasPasswordField) {
          if (chrome?.runtime?.id) {
                chrome.runtime.sendMessage({ isUserLoggedIn: false });
            }
            return true;
        }
        const zicUserMenuContainer = document.querySelector('.zic-topbar-user-menu-container');
        const zicUserMenuButton = document.querySelector('[data-automation-id="navbar-item-user-menu-button"]');
        if ((zicUserMenuContainer && isElementVisible(zicUserMenuContainer)) || (zicUserMenuButton && isElementVisible(zicUserMenuButton))) {
            if (chrome?.runtime?.id) {
                chrome.runtime.sendMessage({ isUserLoggedIn: true });
            }
            return true; // Logged in
        }
        const loggedInAs = document.querySelector('#ctl00_homeList li strong');
          if (loggedInAs) {
              const email = loggedInAs.textContent.trim();
              if (email.length > 0) {
                  // User is logged in
                   if (chrome?.runtime?.id) {
                      chrome.runtime.sendMessage({ isUserLoggedIn: true });
                  }
                  return true;
              }
          }
        
        // Check for s-logged-in pattern with user initials
        const sLoggedInUser = document.querySelector('.s-logged-in[data-behavior="loggedUser"]');
        const userInitialsElement = document.querySelector('.g-nav__user-initials');
        if ((sLoggedInUser && isElementVisible(sLoggedInUser)) || 
            (userInitialsElement && isElementVisible(userInitialsElement) && userInitialsElement.textContent.trim().length > 0)) {
            if (chrome?.runtime?.id) {
                chrome.runtime.sendMessage({ isUserLoggedIn: true });
            }
            return true; // Logged in
        }
        
        // Check for Coresight logged-in state
        const coresightLoggedInUser = document.querySelector('#logged-in-user');
        const coresightLogoutLink = document.querySelector('a[href*="action=logout"]');
        if ((coresightLoggedInUser) || (coresightLogoutLink && isElementVisible(coresightLogoutLink))) {
            if (chrome?.runtime?.id) {
                chrome.runtime.sendMessage({ isUserLoggedIn: true });
            }
            return true; // Logged in
        }

        // Check for user-container logged-in state
        const userContainer = document.querySelector('#user-container .nav__primary-user-inner');
        const logoutButton = document.querySelector('form[action="/logout"] button[name="logout"]');
        if ((userContainer && isElementVisible(userContainer)) || (logoutButton && isElementVisible(logoutButton))) {
            if (chrome?.runtime?.id) {
                chrome.runtime.sendMessage({ isUserLoggedIn: true });
            }
            return true; // Logged in
        }

        // Check for GlobalData logged-in state
        const globalDataUserMenu = document.querySelector('.gd-usermenu--name');
        const globalDataSignOut = document.querySelector('a[onclick="Logout();"]');
        if ((globalDataUserMenu && isElementVisible(globalDataUserMenu)) || (globalDataSignOut && isElementVisible(globalDataSignOut))) {
            if (chrome?.runtime?.id) {
                chrome.runtime.sendMessage({ isUserLoggedIn: true });
            }
            return true; // Logged in
        }

        // Check for 13D Monitor logged-in state
        const monitor13DUserDropdown = document.querySelector('.admin-user-dropdown');
        const monitor13DLogout = document.querySelector('a[href*="__doPostBack"][href*="LinkButton"]');
        if ((monitor13DUserDropdown && isElementVisible(monitor13DUserDropdown)) || (monitor13DLogout && isElementVisible(monitor13DLogout) && monitor13DLogout.textContent.toLowerCase().includes('log out'))) {
            if (chrome?.runtime?.id) {
                chrome.runtime.sendMessage({ isUserLoggedIn: true });
            }
            return true; // Logged in
        }
        
        // Check for legacy Capital IQ logged-in state (Logout link)
        const legacyLogoutLink = document.querySelector('a[href*="/CIQDotNet/Logout.aspx"]');
        if (legacyLogoutLink && isElementVisible(legacyLogoutLink)) {
            if (chrome?.runtime?.id) {
                chrome.runtime.sendMessage({ isUserLoggedIn: true });
            }
            return true; // Logged in
        }

        // Check for S&P Capital IQ Pro logged-in state
        const spgLoggedInUser = document.querySelector('[data-testid="userflyout-icon"]');
        if (spgLoggedInUser && isElementVisible(spgLoggedInUser)) {
            if (chrome?.runtime?.id) {
                chrome.runtime.sendMessage({ isUserLoggedIn: true });
            }
            return true; // Logged in
        }

        // Check for modernhealthcare.com login modal
        const modernHealthcareModal = document.querySelector('[data-testid="onboarding-modal"]');
        if (modernHealthcareModal && isElementVisible(modernHealthcareModal)) {
            if (chrome?.runtime?.id) {
                chrome.runtime.sendMessage({ isUserLoggedIn: false });
            }
            return false; // NOT logged in
        }

        // Check if login modal/popup is visible - if yes, user is NOT logged in
        // Look for various login modal patterns
        const loginModalSelectors = [
            '.modal-container', 
            '.authentication-popup', 
            '#authentication-popup',
            '[id*="login-popup"]',
            '[id*="signin-popup"]',
            '[class*="login-modal"]',
            '[class*="signin-modal"]'
        ];
        
        for (const selector of loginModalSelectors) {
            const modal = document.querySelector(selector);
            if (modal && isElementVisible(modal)) {
                // Check if modal contains login-related text
                const modalText = modal.textContent.toLowerCase();
                if (modalText.includes('sign in') || modalText.includes('log in') || 
                    modalText.includes('login') || modalText.includes('password')) {
                    if (chrome?.runtime?.id) {
                        chrome.runtime.sendMessage({ isUserLoggedIn: false });
                    }
                    return false; // NOT logged in (login modal is visible)
                }
            }
        }
        
        // Check for body class indicating logged in state (Drupal/aviationweek.com pattern)
        if (document.body && document.body.classList.contains('user-logged-in')) {
            if (chrome?.runtime?.id) {
                chrome.runtime.sendMessage({ isUserLoggedIn: true });
            }
            return true; // Logged in (body class indicator)
        }

        // Check for .dn-login-button and inspect its text
        const dnLoginButton = document.querySelector('.dn-login-button');
        if (dnLoginButton && isElementVisible(dnLoginButton)) {
            const buttonText = dnLoginButton.textContent.trim().toLowerCase();
            if (buttonText === 'login') {
                // If the button text is "Login", the user is logged out
                if (chrome?.runtime?.id) {
                    chrome.runtime.sendMessage({ isUserLoggedIn: false });
                }
                return false; // Not logged in
            } else {
                // If the button exists but doesn't say "Login", it's likely the profile button, so user is logged in
                if (chrome?.runtime?.id) {
                    chrome.runtime.sendMessage({ isUserLoggedIn: true });
                }
                return true; // Logged in
            }
        }

        // Check for Broadridge pattern: .account-menu with .ss-user
        const broadridgeAccountMenu = document.querySelector('.account-menu .ss-user');
        if (broadridgeAccountMenu && isElementVisible(broadridgeAccountMenu)) {
            if (chrome?.runtime?.id) {
                chrome.runtime.sendMessage({ isUserLoggedIn: true });
            }
            return true; // Logged in
        }

        // Check for Broadridge pattern: body class 's-is-branded'
        if (document.body && document.body.classList.contains('s-is-branded')) {
            if (chrome?.runtime?.id) {
                chrome.runtime.sendMessage({ isUserLoggedIn: true });
            }
            return true; // Logged in
        }
        
        // Check for CRISIL logged-in state
        const crisilProfileDropdown = document.querySelector('.myprofile-dropdown');
        const crisilProfileName = document.querySelector('.home-profile-name');
        const crisilLogoutLink = document.querySelector('a.logout');
        if ((crisilProfileDropdown && isElementVisible(crisilProfileDropdown)) || 
            (crisilProfileName && isElementVisible(crisilProfileName)) ||
            (crisilLogoutLink && isElementVisible(crisilLogoutLink))) {
            if (chrome?.runtime?.id) {
                chrome.runtime.sendMessage({ isUserLoggedIn: true });
            }
            return true; // Logged in
        }
        
        // Check for manage logged-in state
        const manageProfileItem = document.querySelector('.LeftnavProfileItem');
        const manageManageAccount = document.querySelector('[aria-label="Manage Account"]');
        const manageProfileText = document.querySelector('.LeftnavProfileItem__text');
        if ((manageProfileItem && isElementVisible(manageProfileItem)) || 
            (manageManageAccount && isElementVisible(manageManageAccount)) ||
            (manageProfileText && isElementVisible(manageProfileText) && manageProfileText.textContent.trim().length > 0)) {
            if (chrome?.runtime?.id) {
                chrome.runtime.sendMessage({ isUserLoggedIn: true });
            }
            return true; // Logged in
        }
        
        // Check for IDC username button pattern (data-qa="username" with actual name)
        const usernameButton = document.querySelector('button[data-qa="username"]');
        if (usernameButton && isElementVisible(usernameButton)) {
            const usernameText = usernameButton.textContent?.trim() || '';
            // Check if button contains actual text (username) and not just empty or generic text
            if (usernameText.length > 3 && 
                !usernameText.toLowerCase().includes('login') && 
                !usernameText.toLowerCase().includes('sign in')) {
                if (chrome?.runtime?.id) {
                    chrome.runtime.sendMessage({ isUserLoggedIn: true });
                }
                return true; // Logged in
            }
        }
        
        // Check for settings link (common logged-in indicator)
        const settingsLink = document.querySelector('a[href*="/settings/"][data-qa="settings"]');
        if (settingsLink && isElementVisible(settingsLink)) {
            if (chrome?.runtime?.id) {
                chrome.runtime.sendMessage({ isUserLoggedIn: true });
            }
            return true; // Logged in
        }
               
        const logoutKeywords = ["log out", "logout","log-out", "log off", "sign out","signoff", "sign off","sign-out"];
        const secondaryLogoutKeywords = ["my dashboard", "my profile", "my connect", "my account", "manage your account",
          "preferences","manage my company","account settings","view profile","profile settings","account overview"];
        const loginKeywords = ["log in", "signin", "sign in", "login"];
        let myAccFound = false;
        let logoutMyAccFound = false;
        // Check for "My Account" text, which indicates a logged-in state
        const myAccountElements = document.querySelectorAll('a, button, span');
        for (const el of myAccountElements) {
            if (!myAccFound && isElementVisible(el) && el.textContent.trim().toLowerCase() === 'my account') {
              myAccFound = true;
            }
            if (!logoutMyAccFound && logoutKeywords.some(keyword => containsKeywordWithWordBoundary(el.textContent.trim().toLowerCase(), keyword))) {
                  logoutMyAccFound = true;
            }
            if (logoutMyAccFound && myAccFound) {  
              if (chrome?.runtime?.id) {
                    chrome.runtime.sendMessage({ isUserLoggedIn: true });
                }
                return true;
            }
        }

        // Check for auth-header-actions for login/logout buttons
        const authHeader = document.querySelector('.auth-header-actions');
        if (authHeader) {
            const logoutButton = authHeader.querySelector('a[href*="logout"], button.logout');
            if (logoutButton && isElementVisible(logoutButton)) {
                if (chrome?.runtime?.id) {
                    chrome.runtime.sendMessage({ isUserLoggedIn: true });
                }
                return true; // Logged in
            }
        }

        // Check for header-actions for sign-out button
        const headerActions = document.querySelector('.header-actions');
        if (headerActions) {
            const signOutButton = Array.from(headerActions.querySelectorAll('a, button')).find(el => el.textContent.trim().toLowerCase() === 'sign out');
            if (signOutButton && isElementVisible(signOutButton)) {
                if (chrome?.runtime?.id) {
                    chrome.runtime.sendMessage({ isUserLoggedIn: true });
                }
                return true; // Logged in
            }
        }

        // Check for profile-menu-item with a logout link
        const profileMenuItems = document.querySelectorAll('.profile-menu-item');
        for (const item of profileMenuItems) {
            const logoutLink = item.querySelector('a[href*="logout"]');
            if (logoutLink && isElementVisible(logoutLink)) {
                if (chrome?.runtime?.id) {
                    chrome.runtime.sendMessage({ isUserLoggedIn: true });
                }
                return true; // Logged in
            }
        }

        // Check for "You are using the account of" text - moved earlier and made more efficient
        const pageText = document.body.innerText.toLowerCase();
        if (pageText.includes('you are using the account of') || pageText.includes('you are using account of')) {
            if (chrome?.runtime?.id) {
                chrome.runtime.sendMessage({ isUserLoggedIn: true });
            }
            return true; // Logged in (account info text found)
        }
        
        const loginFoundonPage = loginKeywords.some(keyword =>
          containsKeywordWithWordBoundary(pageText, keyword)
        );
        // Only check clickable elements that are likely to be buttons/links
        const elements = document.querySelectorAll("a, button, span[role='button'], [role='link']");
        
        // First, do a priority check for primary logout keywords. If found, user is definitely logged in.
        let logoutKeyFound = false;
        let logoutSecKeyFound = false;
        for (let el of elements) {
          const text = el.textContent.toLowerCase().trim(); // Use textContent to get all text including from child elements
            if (isElementVisible(el)) {
                if (logoutKeywords.some(keyword => containsKeywordWithWordBoundary(text, keyword))) {
                    if (chrome?.runtime?.id) {
                        chrome.runtime.sendMessage({ isUserLoggedIn: true });
                    }
                    return true; // Priority logout keyword found, definitely logged in.
                }
            }else{
                if (!logoutKeyFound && logoutKeywords.some(keyword => containsKeywordWithWordBoundary(text, keyword))) {
                    logoutKeyFound = true;
                }
                if (!logoutSecKeyFound && secondaryLogoutKeywords.some(keyword => containsKeywordWithWordBoundary(text, keyword)) && !loginFoundonPage) {
                    logoutSecKeyFound = true;
                }
                if (logoutKeyFound && logoutSecKeyFound) {
                  const crisilProfileDropdown = document.querySelector('.myprofile-dropdown');
                  const crisilProfileName = document.querySelector('.home-profile-name');
                  if ((crisilProfileDropdown && !isElementVisible(crisilProfileDropdown)) || 
                      (crisilProfileName && !isElementVisible(crisilProfileName))) {
                      if (chrome?.runtime?.id) {
                          chrome.runtime.sendMessage({ isUserLoggedIn: false });
                      }
                      return true; // Logged in
                  }else{  
                  if (chrome?.runtime?.id) {
                        chrome.runtime.sendMessage({ isUserLoggedIn: true });
                    }
                    return true;
                  }
                }
            }
        }

        try{
            let foundLogin = false;
            let foundLogout = false;
            
            for (let el of elements) {
                if (!isElementVisible(el)) {
                    continue; // Skip hidden elements
                }
                
                // Skip elements inside login/signup modals or popups
                if (el.closest('.modal-container, .modal-window, .authentication-popup, [class*="login"], [class*="signin"], [id*="login"], [id*="signin"]')) {
                    continue;
                }
                
                // Get only the direct text content, not from all descendants
                let text = getDirectText(el).toLowerCase().trim();
                
                // Skip if text is too long (likely a container with multiple items)
                if (text.length > 100) {
                    continue;
                }

                if (secondaryLogoutKeywords.some(keyword => containsKeywordWithWordBoundary(text, keyword))) {
                    // Double-check that this specific element is truly visible
                    if (isElementVisible(el)) {
                        foundLogout = true;
                    }
                }

                if (loginKeywords.some(keyword => containsKeywordWithWordBoundary(text, keyword))) {
                    // Double-check that this specific element is truly visible
                    if (isElementVisible(el)) {
                        foundLogin = true;
                    }
                }
            }
            
            // If both found, assume NOT logged in (safer default)
            // This handles cases where both appear in navigation/menus
            if(foundLogout && foundLogin){
                try{
                    chrome.runtime.sendMessage({ isUserLoggedIn: false });
                }catch(error){}
                return false;
            }
            
            // If only logout found (no login), user is logged in
            // BUT first check if there are login input fields visible - if so, user is NOT logged in
            if (foundLogout && !foundLogin){
                // Double-check: are there visible login input fields on the page?
                const hasLoginInputs = isLoginInputPresent();
                if (hasLoginInputs || loginFoundonPage) {
                    try {
                        chrome.runtime.sendMessage({ isUserLoggedIn: false });
                    } catch(error) {}
                    return false; // NOT logged in (login inputs present)
                }
                
                if (chrome?.runtime?.id) {
                    chrome.runtime.sendMessage({ isUserLoggedIn: true });
                }
                return true;  // Logged in   
            }
            
            // If only login found (no logout), user is NOT logged in
            if (foundLogin && !foundLogout){
                try{
                    chrome.runtime.sendMessage({ isUserLoggedIn: false });   
                }catch(error){}     
                return false;  // Not logged in
            }
            
            // Check for greeting text patterns like "Hello, [Name]" or "Hi [Name]" - strong indicator of logged in state
            const greetingElements = document.querySelectorAll('div, span, p, button');
            for (const greetingEl of greetingElements) {
                if (isElementVisible(greetingEl)) {
                    const greetingText = greetingEl.textContent?.trim() || '';
                    const lowerText = greetingText.toLowerCase();
                    // Check for "Hello, [Name]" or "Hi, [Name]" pattern (comma makes it more specific)
                    if ((lowerText.startsWith('hello,') || lowerText.startsWith('hi,') || lowerText.startsWith('welcome,')) && greetingText.length > 8) {
                        // Ensure it's not just "Hello, please login" or similar
                        if (!loginKeywords.some(keyword => containsKeywordWithWordBoundary(lowerText, keyword))) {
                            if (chrome?.runtime?.id) {
                                chrome.runtime.sendMessage({ isUserLoggedIn: true });
                            }
                            return true; // Logged in (personalized greeting found)
                        }
                    }
                    // Check for "Hello [Name]" without comma (space-separated)
                    if (lowerText.startsWith('hello ') && greetingText.length > 10) {
                        // Make sure there's likely a name after "Hello " (check for capital letter pattern)
                        const afterHello = greetingText.substring(6).trim();
                        if (afterHello.length > 2 && /^[A-Z]/.test(afterHello)) {
                            if (!loginKeywords.some(keyword => containsKeywordWithWordBoundary(lowerText, keyword))) {
                                if (chrome?.runtime?.id) {
                                    chrome.runtime.sendMessage({ isUserLoggedIn: true });
                                }
                                return true; // Logged in (personalized greeting found)
                            }
                        }
                    }
                }
            }
            
            // Check for links to common account/dashboard pages
            const accountPageLinks = document.querySelectorAll('a[href*="/profile"], a[href*="/dashboard"]');
            

            for (const link of accountPageLinks) {
                if (isElementVisible(link)) {
                    const linkText = link.textContent.toLowerCase().trim();
                    if (!loginKeywords.some(keyword => containsKeywordWithWordBoundary(linkText, keyword)) && !loginFoundonPage) {
                        if (chrome?.runtime?.id) {
                            chrome.runtime.sendMessage({ isUserLoggedIn: true });
                        }
                        return true; // Logged in (link to account/dashboard page found)
                    }
                }
            }
            // // Check for "My Account" link with /profile href (common pattern)
            // const myAccountProfileLink = document.querySelectorAll('a[href="/profile"]');
            // if (myAccountProfileLink && isElementVisible(myAccountProfileLink) && 
            //     myAccountProfileLink.textContent.trim().toLowerCase().includes('my account')) {
            //     if (chrome?.runtime?.id) {
            //         chrome.runtime.sendMessage({ isUserLoggedIn: true });
            //     }
            //     return true; // Logged in
            // }
            // Check for profile icons/avatars as additional signal
            const profileSelectors = [
                ".fa-circle-user", ".profile-pic", ".user-avatar", ".account-name", 
                ".avatar", ".user-initial", ".user-initials", ".user_image", ".user-img",
                ".my-profile-icon", ".profile-image", ".profile-icon",
                ".authenticated-user-wrapper", ".user-logo-wrapper", "button.user-avatar",
                // Additional selectors for modern account menus
                "button[aria-label='Account']", "button[aria-label='account']",
                "button[aria-label='account-button']",
                "button[data-testid='navbar-account-button-icon']",
                "button[data-testid='profile-button']",
                "button[data-testid='profile-menu-button']",
                "button[aria-label*='User']", "button[aria-label*='user']",
                "button[aria-label*='Profile']", "button[aria-label*='profile']",
                "nav-action-item-image", ".account-menu", ".user-menu",
                ".account-container", ".account-button",
                // Material-UI specific selectors
                ".MuiListItemButton-root", ".MuiListItem-root",
                // Angular specific selectors
                "header-nav-item-user-settings", "app-header-nav-item[aria-label='Account']",
                ".user-initials", "span.user-initials", "span.user-initials.round",
                // Gravatar/Profile image selectors
                "img.rounded-full[src*='gravatar']", "img.rounded-full[src*='avatar']",
                // Trendtracker specific - profile link in nav footer
                "img.user-img", "a[href='/next/settings'] img.user-img",
                // More generic selectors
                'a[href*="my-account"]',
                'a[href*="/dashboard"]',
                '[aria-label*="Open user menu"]',
                '[aria-label*="User menu"]',
                '[aria-label*="Profile menu"]',
                '[data-nav="profile"]',
                '[data-qa="username"]',
                'div.rounded-full.cursor-pointer'
            ];
            
            for (let selector of profileSelectors) {
                let elements;
                try {
                    elements = document.querySelectorAll(selector);
                } catch (e) {
                    continue; // Skip invalid selectors
                }
                
                for (let el of elements) {
                    if (!isElementVisible(el)) {
                        continue;
                    }
                    
                    // Check for profile button with Gravatar image
                    if (el.matches('button[data-testid="profile-button"]') || el.matches('img.rounded-full')) {
                        const parentButton = el.closest('button[data-testid="profile-button"]');
                        if (parentButton || el.matches('img.rounded-full')) {
                            // Look for associated email or username nearby
                            const parent = el.closest('div');
                            if (parent) {
                                const emailEl = parent.querySelector('p[aria-label="Email address"]');
                                const usernameEl = parent.querySelector('p[aria-label="Username"]');
                                
                                if (emailEl || usernameEl) {
                                    if (chrome?.runtime?.id) {
                                        chrome.runtime.sendMessage({ isUserLoggedIn: true });
                                    }
                                    return true;  // Logged in (profile with email/username)
                                }
                            }
                            
                            // Profile button with gravatar is enough indication
                            if (chrome?.runtime?.id) {
                                chrome.runtime.sendMessage({ isUserLoggedIn: true });
                            }
                            return true;  // Logged in (gravatar profile image)
                        }
                    }
                    
                    // Check for user initials (like "GT" in a span or link)
                    const initialsElements = el.querySelectorAll('.user-initials, span.user-initials, .round');
                    for (let initialsEl of initialsElements) {
                        const initialsText = initialsEl.textContent?.trim() || '';
                        if (initialsText.length >= 2 && initialsText.length <= 4 && /^[A-Z]{2,4}$/.test(initialsText)) {
                            if (chrome?.runtime?.id) {
                                chrome.runtime.sendMessage({ isUserLoggedIn: true });
                            }
                            return true;  // Logged in (user initials found)
                        }
                    }

                    // More generic check for rounded divs with initials (like Darcy Partners)
                    if ((el.tagName === 'DIV' || el.tagName === 'SPAN') && el.className.includes('rounded-full')) {
                        const initialsText = el.textContent?.trim() || '';
                        if (initialsText.length >= 2 && initialsText.length <= 4 && /^[A-Z]{2,4}$/.test(initialsText)) {
                            if (chrome?.runtime?.id) {
                                chrome.runtime.sendMessage({ isUserLoggedIn: true });
                            }
                            return true; // Logged in (generic rounded div with initials)
                        }
                    }
                    
                    // Check for authenticated-user-wrapper with user-avatar button containing initials
                    if (el.matches('.authenticated-user-wrapper') || el.closest('.authenticated-user-wrapper')) {
                        const userAvatarBtn = el.querySelector('button.user-avatar') || 
                                            (el.matches('button.user-avatar') ? el : null);
                        if (userAvatarBtn && isElementVisible(userAvatarBtn)) {
                            const avatarText = userAvatarBtn.textContent?.trim() || '';
                            // Check for user initials (2-4 capital letters)
                            if (avatarText.length >= 2 && avatarText.length <= 4 && /^[A-Z]{2,4}$/.test(avatarText)) {
                                if (chrome?.runtime?.id) {
                                    chrome.runtime.sendMessage({ isUserLoggedIn: true });
                                }
                                return true; // Logged in (authenticated-user-wrapper with initials)
                            }
                        }
                    }
                    
                    // Check for Material-UI user profile items with person icon
                    const hasMuiPersonIcon = el.querySelector('svg path[d*="M12 6c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2"]') ||
                                            el.querySelector('.MuiListItemIcon-root svg[viewBox="0 0 24 24"]');
                    
                    if (hasMuiPersonIcon) {
                        const text = el.textContent?.trim() || '';
                        // Check if it contains a name (more than just icon, has actual text)
                        if (text.length > 2 && !text.toLowerCase().includes('login') && !text.toLowerCase().includes('sign in')) {
                            if (chrome?.runtime?.id) {
                                chrome.runtime.sendMessage({ isUserLoggedIn: true });
                            }
                            return true;  // Logged in (MUI profile with name)
                        }
                    }
                    
                    // Additional check: look for greeting text like "Hello [Name]"
                    const text = el.textContent?.trim() || '';
                    if (text.toLowerCase().startsWith('hello ') && text.length > 6) {
                        if (chrome?.runtime?.id) {
                            chrome.runtime.sendMessage({ isUserLoggedIn: true });
                        }
                        return true;  // Logged in (greeting found)
                    }
                    
                    // Check for user initials in tooltip or similar elements
                    const hasInitials = el.querySelector('[data-testid="tooltip"]') || 
                                       el.querySelector('.tooltip-container') ||
                                       el.classList.contains('account-button');
                    
                    if (hasInitials) {
                        if (chrome?.runtime?.id) {
                            chrome.runtime.sendMessage({ isUserLoggedIn: true });
                        }
                        return true;  // Logged in
                    }
                    
                    // Standard profile icon check (for non-MUI, non-Angular, non-gravatar elements)
                    if (!selector.includes('MuiListItem') && !selector.includes('header-nav-item') && !selector.includes('gravatar') && !loginFoundonPage) {
                        if (chrome?.runtime?.id) {
                            chrome.runtime.sendMessage({ isUserLoggedIn: true });
                        }
                        return true;  // Logged in
                    }
                }
            }
            
            // Neither login nor logout found - do additional checks
            if(!foundLogout && !foundLogin){
                const isFound = isLoginInputButton();
                if(isFound){
                    chrome.runtime.sendMessage({ isUserLoggedIn: !isFound }); 
                }else{
                    if (window.location.href.includes("https://connect.ihsmarkit.com/") ) {
                        try{
                                chrome.runtime.sendMessage({ isUserLoggedIn: true });
                        }catch(error){} 
                        return;
                    }else{
                        ///
                        let isLoginFound = false;
                        try {
  const iframes = document.querySelectorAll('iframe');
  const instrumentedIframes = new WeakSet();

  iframes.forEach(iframe => {
    if (instrumentedIframes.has(iframe)) return;

    iframe.addEventListener('load', () => {
      let iframeDocument;

      try {
        iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
      } catch (e) {
        return;
      }

      if (!iframeDocument) return;

      // ✅ Listen for clicks inside the iframe
      iframeDocument.addEventListener('click', event => {

        const rawTarget = event.target;
        if (!rawTarget) return;

        const clickable = findClickableAncestor(rawTarget);
        if (!clickable) return;

        const label = getElementLabel(clickable);
        const parentLabel = getParentLabel(clickable);

        if (label.toLowerCase().includes("run")) {

          const queryText = getCodeMirrorText(iframeDocument);
          if (queryText) {
          } else {
          }

          const caseName = getCaseName(iframeDocument);
          const { role, warehouse } = getRoleAndWarehouse(iframeDocument);
          const { database, schema } = getDBAndSchema(iframeDocument);

          waitForSnowflakeExecution(() => {
            const activeTabName = getActiveTabName(iframeDocument);
            const queryData = {
                query: queryText,
                caseN: role,
                warehouse: warehouse,
                schema: schema,
                clickedAt: new Date().toISOString()
            };
            if(activeTabName) {
                // Store in chrome local storage
                chrome.storage.local.set({ [activeTabName]: queryData }, function () {
                });
            }
            chrome.runtime.sendMessage({
              type: "QUERY_CAPTURED",
              payload: queryData
            });
          }, iframeDocument);
        }
        if (label.toLowerCase().includes("download as")) {
          const activeTabName = getActiveTabName(iframeDocument);
          chrome.runtime.sendMessage({
              type: "QUERY_DOWNLOADED_SF",
              payload: {
                activeTabName: activeTabName
              }
            });
        }
      }, true);

      // ✅ Detect login presence
      const targetElement = iframeDocument.querySelector('.eikonbarBtn');
      if (targetElement) {
        isLoginFound = true;
        chrome.runtime.sendMessage({ isUserLoggedIn: true });
      }

      instrumentedIframes.add(iframe);
    });
  });

  // --- Helpers ---

  function getCaseName(doc = document) {
    const span = doc.querySelector('span.ks.gm.al.h8.ds.dt');
    return span?.textContent?.trim() || null;
  }

  function getRoleAndWarehouse(doc = document) {
    const result = { role: null, warehouse: null };
    const container = doc.querySelector('[data-testid="roleAndWarehouseSelector"]');
    if (!container) return result;

    const spans = container.querySelectorAll('span');
    if (spans.length < 12) return result;

    const roleSpan = spans[4];
    const warehouseSpan = spans[11];

    const role = roleSpan?.textContent?.trim() || null;
    const warehouseFull = warehouseSpan?.textContent?.trim() || null;
    const warehouse = warehouseFull?.split('(')[0]?.trim() || null;

    return { role, warehouse };
  }
  function getDBAndSchema(doc = document) {
    const container = doc.querySelector('[data-testid="databaseAndSchemaSelector"]');
    if (!container) return { database: null, schema: null };

  // Get the span containing the text like "DB_123455_56.WEATHER"
  const span = container.querySelector('span');
  if (!span) return { database: null, schema: null };

  // Extract the raw text content (before the SVG)
  const rawText = span.childNodes[0]?.textContent?.trim() || '';
  if (!rawText) return { database: null, schema: null };

  // Split on the first dot
  const parts = rawText.split('.');

  const database = parts[0] || null;
  const schema = parts.length > 1 ? parts[1] || null : null;

  return { database, schema };
}
  function waitForSnowflakeExecution(callback, doc = document, waitDuration = 5000) {
    const startTime = Date.now();

    const interval = setInterval(() => {
      const errorContainer = doc.querySelector('[data-testid="results-view-error"]');
      const errorText = errorContainer?.innerText?.trim().toLowerCase() || "";
      const errorContainer1 = doc.querySelector('[data-testid="worksheetsv2-query-results-error"]');
      const errorText1 = errorContainer1?.innerText?.trim().toLowerCase() || "";
      
      if (
        errorText.includes("error") ||
        errorText.includes("does not exist") ||
        errorText.includes("not authorized") ||
        errorText.includes("sql compilation") ||
        errorText.length > 0 ||
        errorText1.includes("error") ||
        errorText1.includes("does not exist") ||
        errorText1.includes("not authorized") ||
        errorText1.includes("sql compilation") ||
        errorText1.length > 0
      ) {
        clearInterval(interval);
        return;
      }

      if (Date.now() - startTime > waitDuration) {
        clearInterval(interval);
        callback();
      }
    }, 3000);
  }

  function getActiveTabName(doc = document) {
  try {
    // Find the SVG element that uses the "selected" UI fill color
    const selectedSvg = doc.querySelector('svg path[fill="var(--themed-reusable-selected-ui)"]');
    if (selectedSvg) {
      // Traverse up the DOM to find the tab container
      let current = selectedSvg.closest('div[class*="blt"]'); // likely inside tab
      while (current && current.getAttribute('role') !== 'button') {
        current = current.parentElement;
      }

      if (current) {
        // Extract the label (timestamp) from inside this tab
        const labelElement = current.querySelector('div[class*="blt"] > div > div');
        if (labelElement && labelElement.textContent.trim()) {
          const tabName = labelElement.textContent.trim();
          return tabName;
        }
      }
    }

    // If fallback is needed
    const fallbackSelectors = [
      '[data-testid*="worksheet"] [data-testid*="name"]',
      '.worksheet-title',
      '.active-worksheet-name',
      '[aria-label*="worksheet" i]'
    ];

    for (const selector of fallbackSelectors) {
      const element = doc.querySelector(selector);
      if (element && element.textContent.trim()) {
        const name = element.textContent.trim();
        return name;
      }
    }

    return 'Unknown Tab';

  } catch (error) {
    return 'Error retrieving tab name';
  }
}

  function findClickableAncestor(el) {
    let node = el;
    while (node && node !== document.body) {
      const isInteractive =
        node.hasAttribute("role") ||
        node.hasAttribute("tabindex") ||
        node.tagName === "BUTTON" ||
        node.tagName === "A";

      if (isInteractive) return node;
      node = node.parentElement;
    }
    return null;
  }

  function getElementLabel(el) {
    if (!el) return "";

    return (
      el.getAttribute("aria-label") ||
      el.getAttribute("title") ||
      el.getAttribute("alt") ||
      (el.innerText || el.textContent || "")
    ).trim();
  }

  function getParentLabel(el) {
    let parent = el.closest("label, div, span, section, button");
    while (parent && parent !== document.body) {
      const label = getElementLabel(parent);
      if (label && label.length > 0 && label !== getElementLabel(el)) {
        return label;
      }
      parent = parent.parentElement;
    }
    return null;
  }

  function getCodeMirrorText(doc = document) {
    const selection = doc.defaultView?.getSelection();
    const selectedText = selection?.toString()?.trim();

    if (selectedText) return selectedText;

    const editor = doc.querySelector(".cm-content");
    if (!editor) return "";

    const lines = editor.querySelectorAll(".cm-line");
    return Array.from(lines)
      .map(line => line.innerText)
      .join("\n")
      .trim();
  }

} catch (err) {
}

                        setTimeout(() => {
                            if (!isLoginFound) {
                                try{
                                    chrome.storage.local.get(['RM_DB_USER_EMAILID'], function(result) {
                                    try{
                                        userValueCheck = result?.RM_DB_USER_EMAILID;
                                        if(userValueCheck){
                                            const isEmailFound = checkEmailExist();
                                            try{
                                                chrome.runtime.sendMessage({ isUserLoggedIn: isEmailFound }); 
                                            }catch(error){} 
                                        }
                                    } catch (err) {}
                                    });
                                } catch (err) {}
                            }
                        }, 1000);
                        
                        
                    }
                }
                return;
            }
        }catch(error){}
    }
    return 'not_found'; // Indeterminate state
}
function getDirectText(el) {
    // Get only the direct text content of an element, excluding hidden children
    let text = '';
    for (let node of el.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
            text += node.textContent;
        } else if (node.nodeType === Node.ELEMENT_NODE && isElementVisible(node)) {
            // Only include visible child elements' text
            text += node.textContent;
        }
    }
    return text.trim();
}
function containsKeywordWithWordBoundary(text, keyword) {
    // Use word boundary matching to avoid false positives like "resigning" matching "signin"
    // Escape special regex characters in the keyword
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Create regex with word boundaries - \b matches position at word boundary
    const regex = new RegExp('\\b' + escapedKeyword + '\\b', 'i');
    return regex.test(text);
}
function isElementVisible(el) {
    if (!el) return false;
    // Check if the element is currently in the DOM
    if (!document.body.contains(el)) return false;

    // Check styles of the element itself AND all its ancestors
    let current = el;
    while (current && current !== document.body) {
        const style = window.getComputedStyle(current);
        
        // Check for various hiding methods
        if (style.display === 'none' || 
            style.visibility === 'hidden' || 
            style.visibility === 'collapse' ||
            parseFloat(style.opacity) === 0) {
            return false;
        }
        
        // Check for common hiding classes
        const className = current.className || '';
        if (typeof className === 'string' && 
            (className.includes('hidden') || 
             className.includes('hide') || 
             className.includes('invisible'))) {
            // Double-check with computed style
            if (style.display === 'none' || style.visibility === 'hidden') {
                return false;
            }
        }
        
        current = current.parentElement;
    }

    // Final check on the element's own bounding box
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
        return false;
    }
    
    return true;
}
function isLoginInputButton() {
    // Select all input elements of type "submit"
    let inputElements = document.querySelectorAll('input[type="submit"]');

    for (let input of inputElements) {
        // Check if the input has value "Login"
        if (input.value.trim().toLowerCase() === "login") {
            return true; // Exit function as soon as "Login" button is found
        }
    }
    return false;
}
function isLoginInputPresent() {
    // Define common placeholders related to login
    const loginPlaceholders = [
        "enter your email", "enter email", "your email",
        "enter your password", "enter password", "Enter your organizational email address"
    ];

    // Get all input fields
    const inputs = document.querySelectorAll("input");

    for (let input of inputs) {
        let placeholder = input.placeholder?.toLowerCase().trim();

        // Check if placeholder matches login keywords
        if (placeholder && loginPlaceholders.some(keyword => placeholder.includes(keyword))) {
            return true;
        }
    }
    return false;
}
function checkEmailExist() {
    const elements = document.querySelectorAll("body, body *");
    const searchValue = userValueCheck.toLowerCase(); // Convert input to lowercase
    
    for (let i = 0; i < elements.length; i++) {
        const el = elements[i];

        if (el.children.length === 0 && el.textContent.toLowerCase().trim().includes(searchValue)) { 
            return true;
        }else if (el.children.length === 0 && el.textContent.toLowerCase().trim().includes("my connect")) { 
            return true;
        }
        // Check INPUT/TEXTAREA values, but EXCLUDE form fields where users enter their email
        // (contact forms, registration forms, etc.) - these indicate NOT logged in
        if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
            // Skip email input fields (contact forms, login forms, registration forms)
            const isEmailField = el.type === "email" || 
                                 el.type === "text" && (
                                     (el.name && el.name.toLowerCase().includes("email")) ||
                                     (el.id && el.id.toLowerCase().includes("email")) ||
                                     (el.placeholder && el.placeholder.toLowerCase().includes("email"))
                                 );
            
            // Skip fields inside forms (likely contact/registration forms)
            const isInsideForm = el.closest('form');
            
            // Only check value if it's NOT an email input field and NOT inside a form
            if (!isEmailField && !isInsideForm) {
                if (el.value.toLowerCase().trim().includes(searchValue)) {
                    return true;
                }
            }
        }
        // Check if the element has a shadow DOM
        if (el.shadowRoot) {
            const shadowElements = el.shadowRoot.querySelectorAll("*");
            for (let j = 0; j < shadowElements.length; j++) {
                const shadowEl = shadowElements[j];

                if (shadowEl.children.length === 0 && shadowEl.textContent.toLowerCase().trim().includes(searchValue)) {
                    return true;
                }else if (shadowEl.children.length === 0 && shadowEl.textContent.toLowerCase().trim().includes("my connect")) {
                    return true;
                }
            }
        }
    }
    return false;
}


    try{
        chrome.runtime.sendMessage({ isUserLoggedIn: isUserLoggedInFunc() });
    }catch(error){}
    // Monitor dynamic changes using MutationObserver
    const observer = new MutationObserver((mutations) => {
        if(isUserLoggedInFunc()){
            return;
        }
        mutations.forEach(() => isUserLoggedInFunc()); // Rescan whenever content changes
    });

    // Observe changes in the body
    observer.observe(document.body, { childList: true, subtree: true });
    // Wait for the DOM to load completely
    document.addEventListener("DOMContentLoaded", function () {
        try{
            chrome.runtime.sendMessage({ isUserLoggedIn: isUserLoggedInFunc() });
        }catch(error){}
    });
    function detectLoginForm() {
      const forms = document.querySelectorAll('form');

      for (const form of forms) {
        const action = (form.action || '').toLowerCase();
        const id = (form.id || '').toLowerCase();
        const className = (form.className || '').toLowerCase();
        const formText = action + id + className;

        // Check if this is an auth-related form
        if (formText.includes('login') ||
            formText.includes('signin') ||
            formText.includes('sign-in') ||
            formText.includes('signup') ||
            formText.includes('sign-up') ||
            formText.includes('register') ||
            formText.includes('auth')) {

          // Verify it has a password field
          const hasPassword = form.querySelector(
            'input[type="password"], input[autocomplete*="password"]'
          );

          if (hasPassword && isElementVisible(form)) {
            return true;
          }
        }
      }

      return false;
    }

    /**
     * Detect password input fields anywhere on the page
     * Password fields + login context = login form (logged out)
     */
    function detectPasswordFields() {
      const passwordFields = document.querySelectorAll(
        'input[type="password"], ' +
        'input[autocomplete="current-password"], ' +
        'input[autocomplete="new-password"], ' +
        'input[autocomplete*="password"]'
      );

      return passwordFields.length > 0;
    }
function getStorageData(keys) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(keys, (result) => {
            if (chrome.runtime.lastError) {
                return reject(chrome.runtime.lastError);
            }
            resolve(result);
        });
    });
}
async function isValidOpenSource(sourceURL) {
    try {
        let result = await getStorageData(["trackedSites", "domainRegex"]);

        if (result.trackedSites && result.domainRegex) {
            const recordsMap = new Map(result.trackedSites);
            const regexPattern = new RegExp(result.domainRegex, "i");

            let hostname;
            if (sourceURL.startsWith("blob:") || sourceURL.startsWith("view-source:") || sourceURL.startsWith("filesystem:") || sourceURL.startsWith("data:")) {
                const blobUrl = sourceURL.substring(sourceURL.indexOf(":") + 1);
                hostname = new URL(blobUrl).hostname;
            } else {
                hostname = new URL(sourceURL).hostname;
            }

            hostname = hostname.toLowerCase().replace(/^www\./, "");

            if (regexPattern.test(hostname)) {
                for (const [domain, sourceName] of recordsMap) {
                    if (hostname.includes(domain)) {
                        return sourceName; // Found a match
                    }
                }
            }
            return "DO_NOT_TRACK";
        } else {
            return "DO_NOT_TRACK";
        }
    } catch (error) {
        return "DO_NOT_TRACK";
    }
}

// Function to detect back/forward navigation
function detectBackForward() {
    // Using Performance Navigation API (older method but more reliable in some cases)
    if (window.performance) {
      if (window.performance.navigation && 
          window.performance.navigation.type === window.performance.navigation.TYPE_BACK_FORWARD) {
        reportBackForward('performance_api');
      }
      
      // Using Navigation Timing API (newer method)
      const navEntries = performance.getEntriesByType('navigation');
      if (navEntries.length > 0 && navEntries[0].type === 'back_forward') {
        reportBackForward('navigation_timing_api');
      }
    }
    
  }
  
  // Report back/forward navigation to background script
  function reportBackForward(method) {
    chrome.runtime.sendMessage({
      action: 'navigation',
      method: 'back_forward',
      url: window.location.href,
      timestamp: new Date().toISOString(),
      detectionMethod: method
    });
  }
  
  // Run detection on page load
  if (document.readyState === 'complete') {
    detectBackForward();
  } else {
    window.addEventListener('load', detectBackForward);
  }
  
  // Listen for the popstate event which fires when back/forward buttons are clicked
  window.addEventListener('popstate', function(event) {
    reportBackForward('popstate_event');
  });
  
  // Listen for pageshow event with persisted flag (indicates back/forward navigation)
  window.addEventListener('pageshow', function(event) {
    if (event.persisted) {
      reportBackForward('pageshow_persisted');
    }
  });
  
  // Monitor for any URL changes with MutationObserver
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      // If it's not the first load, it might be a history change
      if (!isFirstLoad) {
        chrome.runtime.sendMessage({
          action: 'urlChange',
          url: url,
          timestamp: new Date().toISOString()
        });
      }
      isFirstLoad = false;
    }
  }).observe(document, {subtree: true, childList: true});
  
  // Also listen for hashchange events
  window.addEventListener('hashchange', function(event) {
    chrome.runtime.sendMessage({
      action: 'navigation',
      method: 'back_forward',
      url: window.location.href,
      timestamp: new Date().toISOString(),
      detectionMethod: 'hashchange',
      oldUrl: event.oldURL,
      newUrl: event.newURL
    });
  });

function getLabel(element) {
    return (
        element.textContent.trim() ||
        element.getAttribute('aria-label') ||
        element.getAttribute('title') ||
        '[No label found]'
    );
}
async function onSearch(searchItem){
    const apiSourcename = await isValidOpenSource(topUrl);
    if(apiSourcename !== 'DO_NOT_TRACK'){
      // Only log for button clicks and dropdown selections, not typing
      if(searchItem.searchType === 'search_button' || 
         searchItem.searchType === 'dropdown_selected' || 
         searchItem.searchType === 'enter_key') {
        chrome.runtime.sendMessage({
          type: "SEARCH_INIT_UIQ",
          payload: {
            searchItem: searchItem.finalSearchTerm,
            sourceName: apiSourcename,
            topUrl: topUrl
          }
        });
      }
    }
}  
function attachClickListener() {
    // Initialize search tracking once, not on every click
    trackSearchInputs(onSearch);
    
    document.addEventListener('click', function (event) {
        const target = event.target;

        // Remove this line - it was causing duplicate listeners
        // trackSearchInputs(onSearch);
        
        // Find the closest <a>, <button>, or role="button"
        const clickable = target.closest('a, li, span, button, [role="button"]');

        // Make sure it's part of the nav menu if you want to limit scope
        const inUserNav = clickable ;

        if (clickable && inUserNav) {
            const label = getLabel(clickable);
            chrome.runtime.sendMessage({ title_calculated: label });
        }
    }, true); // Use capture to catch early
}

// Run immediately or wait for DOM to load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (isValidPage()) attachClickListener();
    });
} else {
    if (isValidPage()) attachClickListener();
}
async function isValidPage() {
    const apiSourcename = await isValidOpenSource(topUrl);
    if(apiSourcename !== 'DO_NOT_TRACK' && apiSourcename === 'Factiva' && document.title !== 'Factiva'){
        return true;
    }
    return false;
}

(function () {
  if(topUrl.includes('snowflake.com')) {
    window.document.addEventListener(
      "click",
      (event) => {
        const rawTarget = event.target;
        if (!rawTarget) return;

      // Traverse up to find the most meaningful clickable parent (role="button", tabindex, etc.)
      const clickable = findClickableAncestor(rawTarget);
      if (!clickable) return;

      const label = getElementLabel(clickable);
      const parentLabel = getParentLabel(clickable);

      if (parentLabel) {
      }

      // Custom logic for detecting specific buttons
      if (label.toLowerCase().includes("run")) {

        const queryText = getCodeMirrorText();
        if (queryText) {
        } else {
        }
        const caseName = getCaseName();
        const{role, warehouse} = getRoleAndWarehouse();
        const { database, schema } = getDBAndSchema();
        waitForSnowflakeExecution(() => {
            const activeTabName = getActiveTabName();
            const queryData = {
                query: queryText,
                caseN: role,
                warehouse: warehouse,
                schema: schema,
                clickedAt: new Date().toISOString()
            };
            if(activeTabName) {
                // Store in chrome local storage
                chrome.storage.local.set({ [activeTabName]: queryData }, function () {
                });
            }
            chrome.runtime.sendMessage({
              type: "QUERY_CAPTURED",
              payload: queryData
            });
        });
      }
      if (label.toLowerCase().includes("download as")) {
          const activeTabName = getActiveTabName();
          chrome.runtime.sendMessage({
              type: "QUERY_DOWNLOADED_SF",
              payload: {
                activeTabName: activeTabName
              }
            });
        }
    },
    true // use capture to ensure we catch all clicks before they’re blocked
  );

  // --- Helpers ---
  function getCaseName() {
  const span = document.querySelector('span.ks.gm.al.h8.ds.dt');
  return span?.textContent?.trim() || null;
}
function getRoleAndWarehouse() {
  const container = document.querySelector('[data-testid="roleAndWarehouseSelector"]');
  if (!container) return { role: null, warehouse: null };

  // Select the outermost span that holds all inner content
  const outerSpan = container.querySelector('span');
  if (!outerSpan) return { role: null, warehouse: null };

  // Find all direct child spans of that outer span
  const topLevelSpans = Array.from(outerSpan.children).filter(el => el.tagName === 'SPAN');

  const role = topLevelSpans[0]?.childNodes[0]?.textContent?.trim() || null;

  const warehouseFull = topLevelSpans[2]?.childNodes[0]?.textContent?.trim() || null;
  const warehouse = warehouseFull?.split('(')[0]?.trim() || null;

  return { role, warehouse };
}

function getDBAndSchema() {
  const container = document.querySelector('[data-testid="databaseAndSchemaSelector"]');
  if (!container) return { database: null, schema: null };

  // Get the span containing the text like "DB_123455_56.WEATHER"
  const span = container.querySelector('span');
  if (!span) return { database: null, schema: null };

  // Extract the raw text content (before the SVG)
  const rawText = span.childNodes[0]?.textContent?.trim() || '';
  if (!rawText) return { database: null, schema: null };

  // Split on the first dot
  const parts = rawText.split('.');

  const database = parts[0] || null;
  const schema = parts.length > 1 ? parts[1] || null : null;

  return { database, schema };
}



  function waitForSnowflakeExecution(callback, waitDuration = 5000) {
    const startTime = Date.now();

    const interval = setInterval(() => {
        const errorContainer = document.querySelector('[data-testid="results-view-error"]');
        const errorText = errorContainer?.innerText?.trim().toLowerCase() || "";
        if (
        errorText.includes("error") ||
        errorText.includes("does not exist") ||
        errorText.includes("not authorized") ||
        errorText.includes("sql compilation") ||
        errorText.length > 0
        ) {
        clearInterval(interval);
        return;
        }
        if (Date.now() - startTime > waitDuration) {
        clearInterval(interval);
        callback(); // Proceed after 5 seconds without error
        }
    }, 300); // Poll every 300ms
    }

 function getActiveTabName() {
    try {
      // Look for the active tab with aria-selected="true"
      const activeTab = document.querySelector('[role="tab"][aria-selected="true"]');
      if (activeTab) {
        // Try to get the tab name from various possible locations
        const tabNameSelectors = [
        // Direct text content from inner div
        '.al.am.hr.ao',
        // Fallback selectors
        '[id^="__js"]',
        '.tab-name',
        '.worksheet-name'
        ];  
        for (const selector of tabNameSelectors) {
        const nameElement = activeTab.querySelector(selector);
        if (nameElement && nameElement.textContent.trim()) {
        const tabName = nameElement.textContent.trim();
        return tabName;
        }
        }  // If no inner element found, try the aria-label
        const ariaLabel = activeTab.getAttribute('aria-label');
        if (ariaLabel) {
        return ariaLabel;
        }  // Last resort: get any text content from the tab
        const textContent = activeTab.textContent.trim();
        if (textContent) {
        return textContent;
        }
      }  // Fallback: look for any element that might indicate the current worksheet name
      const fallbackSelectors = [
      '[data-testid*="worksheet"] [data-testid*="name"]',
      '.worksheet-title',
      '.active-worksheet-name',
      '[aria-label*="worksheet" i]'
      ];  
      for (const selector of fallbackSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent.trim()) {
        const name = element.textContent.trim();
        return name;
        }
      }  
      return 'Unknown Tab'; 
      } catch (error) {
      return 'Error retrieving tab name';
    }
  }

  function findClickableAncestor(el) {
    let node = el;
    while (node && node !== document.body) {
      const isInteractive =
        node.hasAttribute("role") ||
        node.hasAttribute("tabindex") ||
        node.tagName === "BUTTON" ||
        node.tagName === "A";

      if (isInteractive) return node;
      node = node.parentElement;
    }
    return null;
  }

  function getElementLabel(el) {
    if (!el) return "";

    return (
      el.getAttribute("aria-label") ||
      el.getAttribute("title") ||
      el.getAttribute("alt") ||
      (el.innerText || el.textContent || "")
    ).trim();
  }

  function getParentLabel(el) {
    let parent = el.closest("label, div, span, section, button");
    while (parent && parent !== document.body) {
      const label = getElementLabel(parent);
      if (label && label.length > 0 && label !== getElementLabel(el)) {
        return label;
      }
      parent = parent.parentElement;
    }
    return null;
  }

  // function getCodeMirrorText() {
  //   const editor = document.querySelector(".cm-content");
  //   if (!editor) return "";

  //   const lines = editor.querySelectorAll(".cm-line");
  //   const text = Array.from(lines)
  //     .map((line) => line.innerText)
  //     .join("\n")
  //     .trim();

  //   return text;
  // }
  function getCodeMirrorText() {
    // Try to get selection from iframe window if we're in an iframe context
    const currentWindow = window.frameElement ? window : window;
    const selection = currentWindow.getSelection();
    const selectedText = selection?.toString()?.trim();

    if (selectedText) {
      return selectedText;
    }

    // fallback: return full editor content
    const editor = document.querySelector(".cm-content");
    if (!editor) return "";

    const lines = editor.querySelectorAll(".cm-line");
    const text = Array.from(lines)
      .map((line) => line.innerText)
      .join("\n")
      .trim();

    return text;
  }
}
})();

// --- Search tracking state ---
const SearchState = {
  debounceTimer: null,
  lastSearch: null,
  currentTypedTerm: '',
  searchInputElement: null,
  sourceName: 'default',
  currentSearchData: null
};

// --- Storage utilities ---
const SearchStorage = {
  async store(searchData) {
    const apiSourcename = await isValidOpenSource(topUrl);
    if (apiSourcename === 'DO_NOT_TRACK') return;

    // ✅ Overwrite sourceName
    const dataWithSource = { ...searchData, sourceName: apiSourcename };
    const key = `lastSearch_${apiSourcename}`;
    try {
      SearchState.currentSearchData = dataWithSource;
      SearchState.sourceName = apiSourcename; // keep state in sync
    } catch (error) {
    }
  },

  // async get() {
  //   const apiSourcename = await isValidOpenSource(topUrl);
  //   if (apiSourcename === 'DO_NOT_TRACK') return null;

  //   const key = `lastSearch_${apiSourcename}`;
  //   return new Promise((resolve) => {
  //     chrome.storage.local.get([key], (result) => {
  //       resolve(result[key] || null);
  //     });
  //   });
  // },

  // async updateValidity(isValid) {
  //   if (SearchState.currentSearchData) {
  //     const apiSourcename = await isValidOpenSource(topUrl);
  //     if (apiSourcename === 'DO_NOT_TRACK') return;

  //     const updated = { ...SearchState.currentSearchData, isValid, sourceName: apiSourcename };
  //     this.store(updated);
  //   }
  // }
};


// --- Search input tracking ---
function trackSearchInputs(callback, debounceDelay = 500) {
  const getSearchInputValue = (target) => {
    if (target?.tagName === 'INPUT') {
      const isStandardSearch =
        target.type === 'search' ||
        target.placeholder?.toLowerCase().includes('search') ||
        target.name?.toLowerCase().includes('search') ||
        target.id?.toLowerCase().includes('search') ||
        target.className.toLowerCase().includes('search');
	    const isAdditionalSearch = 
        typeof target.getAttribute('aria-label') === 'string' && 
        target.getAttribute('aria-label').toLowerCase().includes('search');
      const isReactSelect =
        target.className.includes('select__input') ||
        target.id.includes('react-select') ||
        target.getAttribute('role') === 'combobox' ||
        target.getAttribute('aria-autocomplete') === 'list';

      if (isStandardSearch || isReactSelect || isAdditionalSearch) {
        return target.value.trim();
      }
    }
    return null;
  };

  const createSearchData = (searchTerm, originalTerm, searchType) => ({
    finalSearchTerm: searchTerm,
    originalTypedTerm: originalTerm || searchTerm,
    searchType,
    sourceName: SearchState.sourceName,
    isValid: false,
    timestamp: Date.now(),
    url: location.href
  });

  const triggerCallback = (value, searchType = 'typed') => {
    if (value) {
      clearTimeout(SearchState.debounceTimer);
      SearchState.lastSearch = value;

      const searchData = createSearchData(value, SearchState.currentTypedTerm, searchType);
      SearchStorage.store(searchData);

      chrome.runtime.sendMessage({ type: "SEARCH_CAPTURED", data: searchData });
      callback(searchData);
    }
  };

  // Typing in inputs (standard + React Select)
  const handleInput = (e) => {
    const value = getSearchInputValue(e.target);
    if (value !== null) {
      SearchState.currentTypedTerm = value;
      SearchState.searchInputElement = e.target;
      clearTimeout(SearchState.debounceTimer);
      SearchState.debounceTimer = setTimeout(() => triggerCallback(value, 'typed'), debounceDelay);
    }
  };

  // Enter key submit
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      const value = getSearchInputValue(e.target);
      if (value !== null) {
        SearchState.currentTypedTerm = value;
        triggerCallback(value, 'enter_key');
      }
    }
  };

  // Clicks (search button or React Select dropdown option)
  const handleClick = (e) => {
    // Search button
    const button = e.target.closest('button, input[type="submit"], .search-btn, [aria-label*="search" i]');
    if (button) {
      const input = button.closest('form, div')?.querySelector(
        'input[type="search"], input[placeholder*="search" i], .select__input, input[role="combobox"]'
      );
      if (input && input.value.trim()) {
        triggerCallback(input.value.trim(), 'search_button');
        return;
      }
    }

    // React Select / dropdown suggestions
    const suggestion = e.target.closest('.select__option, [role="option"], .suggestion-item, .search-suggestion');
    if (suggestion) {
      const selectedValue = suggestion.textContent?.trim() ||
        suggestion.getAttribute('data-value')?.trim();
      if (selectedValue) {
        const searchData = createSearchData(selectedValue, SearchState.currentTypedTerm, 'dropdown_selected');
        SearchStorage.store(searchData);
        chrome.runtime.sendMessage({ type: "SEARCH_CAPTURED", data: searchData });
        triggerCallback(selectedValue, 'dropdown_selected');
      }
    }
  };

  // Before unload: save last search
  const handleBeforeUnload = () => {
    if (SearchState.lastSearch) {
      const searchData = createSearchData(SearchState.lastSearch, SearchState.currentTypedTerm, 'page_unload');
      SearchStorage.store(searchData);
      chrome.runtime.sendMessage({ type: "SEARCH_CAPTURED", data: searchData });
    }
  };

  // Attach listeners
  window.addEventListener('input', handleInput, true);
  window.addEventListener('keydown', handleKeyDown, true);
  window.addEventListener('click', handleClick, true);
  window.addEventListener('beforeunload', handleBeforeUnload, true);

  return () => {
    clearTimeout(SearchState.debounceTimer);
    window.removeEventListener('input', handleInput, true);
    window.removeEventListener('keydown', handleKeyDown, true);
    window.removeEventListener('click', handleClick, true);
    window.removeEventListener('beforeunload', handleBeforeUnload, true);
  };
}