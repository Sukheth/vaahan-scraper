let currentUrl = null;
let startTime = null;
let currentUid = null;
let activeTabId = null; // Currently active tab
let accumulatedTime = 0;  // Accumulated active time
let tabStates = new Map(); 
let unique_user_email = null; //
let firstIdentifier = 0;
let rm_jwtaccess_token = null;
let redirectChainMap = new Map();
let redirectSyncUrlMap = new Map();
let isLoginFound = false;
let pageTitleMap = new Map();
let pageTitleMapUpdate = new Map();
let isUserLoggedIn = false;
let isBackForwAction = new Map();
let caseCodeValue = null;
let wareHouseValue = null;
let schemaValue = null
let genericQuery = null;
let activeTabNameSF = null;
// List of login-related keywords to track
const LOGIN_KEYWORDS = ["okta", "auth", "logon", "login", "signin", "logged", "code=", "state=", "callback", "authorize"];
const AUTH_KEYWORDS = ["authenticated","token"];
const LOGOUT_TITLE = ["signout","sign out","log out", "logout", "sign off", "log off","logoff","signoff"];
const HOME_PAGE_KEYWORDS = ['home','dashboard','login','logout','signup'];
const UIQ_X_APIKEY = 'Ja2RDVsAcEvDBqNDxGIk9BWStU0z5LMD';
const BLOCKED_KEYWORDS = [
  // auth
  'login', 'signin', 'sign-in', 'logout', 'signup', 'register',

  // password & security
  'forgot', 'reset', 'change-password',
  // errors & system
  'error', 'unauthorized', 'forbidden', 'session-expired',

  // redirects / oauth
  'callback', 'redirect', 'oauth', 'sso'
];


