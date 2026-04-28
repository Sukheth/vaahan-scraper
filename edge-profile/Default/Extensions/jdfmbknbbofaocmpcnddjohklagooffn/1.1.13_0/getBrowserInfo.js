function getBrowserName() {
    const userAgent = navigator.userAgent;
    // Check for browserName
    let browserName = "Unknown Browser";
    if (userAgent.indexOf("Edg") > -1) {
      browserName = "Edge";
    } else if (userAgent.indexOf("Chrome") > -1) {
      browserName = "Chrome";
    } else if (userAgent.indexOf("Safari") > -1) {
      browserName = "Safari";
    } else if (userAgent.indexOf("Firefox") > -1) {
      browserName = "Firefox";
    } else if (userAgent.indexOf("Opera") > -1 || userAgent.indexOf("OPR") > -1) {
      browserName = "Opera";
    } else if (userAgent.indexOf("Trident") > -1) {
      browserName = "Internet Explorer";
    }

    // Check for OS
    let operatingSystem = "Unknown OS";
    if (userAgent.indexOf("Win") > -1) {
        operatingSystem = "Windows";
    } else if (userAgent.indexOf("Mac") > -1) {
        operatingSystem = "Mac OS";
    } else if (userAgent.indexOf("Linux") > -1) {
        operatingSystem = "Linux";
    } else if (userAgent.indexOf("Android") > -1) {
        operatingSystem = "Android";
    } else if (userAgent.indexOf("iPhone") > -1 || userAgent.indexOf("iPad") > -1) {
        operatingSystem = "iOS Mobile";
    } else if (userAgent.indexOf("Windows Phone") > -1) {
        operatingSystem = "Windows Phone";
    }

    return { browserName, operatingSystem };
}