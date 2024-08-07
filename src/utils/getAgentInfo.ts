const getAgentInfo = {
  deviceType: '', // pc or mobile
  OSname: '', // windows, Android, linux and so on...
  browserName: '', //  chrome, safari, firefox, IE and so on...
  browserVer: '', //  browser version， important if in IE environment.
  adaptType: 0, // A type value, Adapt to the screen due to width
  init() {
    getAgentInfo.setDeviceAndOS();
    getAgentInfo.setBrowser();
  },
  setDeviceAndOS() {
    let name = 'unknown';
    if (window.navigator.userAgent.indexOf('Android') !== -1) {
      name = 'Android';
    } else if (window.navigator.userAgent.indexOf('iPhone') !== -1) {
      name = 'iPhone';
    } else if (window.navigator.userAgent.indexOf('SymbianOS') !== -1) {
      name = 'SymbianOS';
    } else if (window.navigator.userAgent.indexOf('Windows Phone') !== -1) {
      name = 'Windows Phone';
    } else if (window.navigator.userAgent.indexOf('iPad') !== -1) {
      name = 'iPad';
    } else if (window.navigator.userAgent.indexOf('iPod') !== -1) {
      name = 'iPod';
    }
    if (name !== 'unknown') {
      getAgentInfo.OSname = name;
      getAgentInfo.deviceType = 'mobile';
      return;
    }
    if (window.navigator.userAgent.indexOf('Windows NT 10.0') !== -1) {
      name = 'Windows 10';
    } else if (window.navigator.userAgent.indexOf('Windows NT 6.2') !== -1) {
      name = 'Windows 8';
    } else if (window.navigator.userAgent.indexOf('Windows NT 6.1') !== -1) {
      name = 'Windows 7';
    } else if (window.navigator.userAgent.indexOf('Windows NT 6.0') !== -1) {
      name = 'Windows Vista';
    } else if (window.navigator.userAgent.indexOf('Windows NT 5.1') !== -1) {
      name = 'Windows XP';
    } else if (window.navigator.userAgent.indexOf('Windows NT 5.0') !== -1) {
      name = 'Windows 2000';
    } else if (window.navigator.userAgent.indexOf('Mac') !== -1) {
      name = 'Mac/iOS';
    } else if (window.navigator.userAgent.indexOf('X11') !== -1) {
      name = 'UNIX';
    } else if (window.navigator.userAgent.indexOf('Linux') !== -1) {
      name = 'Linux';
    }
    getAgentInfo.OSname = name;
    getAgentInfo.deviceType = 'pc';
    return getAgentInfo.OSname;
  },
  setBrowser() {
    const nAgt = navigator.userAgent;
    let browserName = navigator.appName;
    let fullVersion = `${parseFloat(navigator.appVersion)}`;
    let majorVersion = parseInt(navigator.appVersion, 10);
    let nameOffset; let verOffset; let ix;

    if ((verOffset = nAgt.indexOf('Opera')) !== -1) { // In Opera, the true version is after "Opera" or after "Version"
      browserName = 'Opera';
      fullVersion = nAgt.substring(verOffset + 6);
      if ((verOffset = nAgt.indexOf('Version')) !== -1) { fullVersion = nAgt.substring(verOffset + 8); }
    } else if ((nAgt.indexOf('Trident')) !== -1) { // ( ver >= ie7) In MSIE, the true version is after "MSIE" in userAgent
      if ((verOffset = nAgt.indexOf('MSIE')) !== -1) {
        fullVersion = nAgt.substring(verOffset + 5);
      } else {
        fullVersion = '11.0';
      }
      if (fullVersion === 5) {
        fullVersion = '11.0';
      }
      browserName = 'IE';
    } else if ((verOffset = nAgt.indexOf('Chrome')) !== -1) {
      // In Chrome, the true version is after "Chrome"
      browserName = 'Chrome';
      fullVersion = nAgt.substring(verOffset + 7);
    } else if ((verOffset = nAgt.indexOf('Safari')) !== -1) {
      // In Safari, the true version is after "Safari" or after "Version"
      browserName = 'Safari';
      fullVersion = nAgt.substring(verOffset + 7);
      if ((verOffset = nAgt.indexOf('Version')) !== -1) { fullVersion = nAgt.substring(verOffset + 8); }
    } else if ((verOffset = nAgt.indexOf('Firefox')) !== -1) {
      // In Firefox, the true version is after "Firefox"
      browserName = 'Firefox';
      fullVersion = nAgt.substring(verOffset + 8);
    } else if ((nameOffset = nAgt.lastIndexOf(' ') + 1) < (verOffset = nAgt.lastIndexOf('/'))) {
      // In most other browsers, "name/version" is at the end of userAgent
      browserName = nAgt.substring(nameOffset, verOffset);
      fullVersion = nAgt.substring(verOffset + 1);
      if (browserName.toLowerCase() === browserName.toUpperCase()) {
        browserName = navigator.appName;
      }
    }
    if ((ix = fullVersion.indexOf(';')) !== -1) {
      // trim the fullVersion string at semicolon/space if present
      fullVersion = fullVersion.substring(0, ix);
    }
    if ((ix = fullVersion.indexOf(' ')) !== -1) {
      fullVersion = fullVersion.substring(0, ix);
    }
    majorVersion = parseInt(`${fullVersion}`, 10);
    if (isNaN(majorVersion)) {
      fullVersion = `${parseFloat(navigator.appVersion)}`;
      majorVersion = parseInt(navigator.appVersion, 10);
    }
    getAgentInfo.browserName = browserName;
    getAgentInfo.browserVer = fullVersion;
  },
};

getAgentInfo.init();

export default getAgentInfo;
