const childProcess = require('child_process'),
      fs      = require('fs'),
      prompts = require('prompts'),
      kleur   = require('kleur');

// [ Variables ]
var election;
var rootPasswd = null;
var instQueue = [];
var introMsg = kleur.blue('██████╗ ███████╗██████╗ ██╗ █████╗ ███╗   ██╗\n'  +
                          '██╔══██╗██╔════╝██╔══██╗██║██╔══██╗████╗  ██║\n'  +
                          '██║  ██║█████╗  ██████╔╝██║███████║██╔██╗ ██║\n'  +
                          '██║  ██║██╔══╝  ██╔══██╗██║██╔══██║██║╚██╗██║\n'  +
                          '██████╔╝███████╗██████╔╝██║██║  ██║██║ ╚████║\n'  +
                          '╚═════╝ ╚══════╝╚═════╝ ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝\n') +
               kleur.red( '  ███████╗███████╗████████╗██╗   ██╗██████╗  \n'  +
                          '  ██╔════╝██╔════╝╚══██╔══╝██║   ██║██╔══██╗ \n'  +
                          '  ███████╗█████╗     ██║   ██║   ██║██████╔╝ \n'  +
                          '  ╚════██║██╔══╝     ██║   ██║   ██║██╔═══╝  \n'  +
                          '  ███████║███████╗   ██║   ╚██████╔╝██║      \n'  +
                          '  ╚══════╝╚══════╝   ╚═╝    ╚═════╝ ╚═╝      \n') +
               kleur.yellow('[ [ By RukkaPlus ] ] ] ] ] ] ] ] ] ] ] ] ] ] ');

// [ Log functions ]
console.info  = (...args) => console.log(kleur.blue('[ INFO ]')    + ' : ' + args);
console.alert = (...args) => console.log(kleur.yellow('[ ALERT ]') + ' : ' + args);
console.error = (...args) => console.log(kleur.red('[ ERROR ]')    + ' : ' + args);

// [ Main function ]
(async () => {
  console.log(introMsg);

  try {
    // Check internet connection
    console.info(await checkInternet());

    // Check superuser permissions
    console.info(await checkRoot());

    // Check for X11 package
    await checkX11();

    initial:
    do {
      // Prompt distros
      election = await promptPkgDistros();
      switch (election) {
        case '[ EXIT ]': console.log('Bye bye! See you later');
                         break initial;
        case '[ INSTALL ]': checkInstall();
                            break;
        default: await promptPkgList(election);
                 break;
      }
    } while (true);
  } catch (err) {
    console.error(err);
  }
  return 0;
})();

// [ Other functions ]
function checkInternet() {
  /* This function detects if the user is connected
   * to internet. This is required for all application
   * functionality
   */
  return new Promise((res, rej) => {
    try {
      require('dns').lookup('google.com', err => {
        if (err && err.code == "ENOTFOUND")
          rej('Cannot resolve internet connection');
        res('Executing with internet connection');
      });
    } catch (err) {
      rej(err);
    }
  });
}
function checkRoot() {
  /* This function detects if the user haves executed
   * the application with superuser permissions
   */
  return new Promise(async (res, rej) => {
    try {
      let stdout = childProcess.execSync('whoami');
      if (stdout !== 'root') {
        console.alert('Executing without "superuser" permissions');
        rootPasswd = await promptRootPassword();
        if (!rootPasswd)
          rej("This application can't run without \"superuser\" permissions");
        res('This password will be used to install packages');
      }
    } catch (err) {
      rej(err);
    }
  });
}
function checkX11() {
  /* This function checks if X11 is installed on
   * the system
   */
  return new Promise(async (res, rej) => {
    try {
      let stdout = childProcess.execSync('xset -q');
      res('X11 is already installed on the system');
    } catch (err) {
      res(await promptInstallX11());
    }
  });
}
function promptRootPassword() {
  let message = 'password for [ sudo ]';
  return new Promise(async (res, rej) => {
    try {
      let response = await prompts({
        type: 'password',
        name: 'value',
        message: message
      });
      res(response.value);
    } catch (err) {
      rej(err);
    }
  });
}
function promptInstallX11() {
  let message = 'Do want to install X11 to display graphics on the desktop?';
  return new Promise(async (res, rej) => {
    try {
      let input = await prompts({
        type: 'confirm',
        name: 'value',
        message: message,
      });
      if (input.value) {
        instQueue.push('xorg');
        res('X11 is ready to be installed on the system');
      } else
        res('X11 not installed on the system');
    } catch (err) {
      rej(err);
    }
  });
}

// [ Package manager functions ]
function getPkgDistros() {
  /* Get all possible distros. Distros are ".json" files
   * that contains a list of packages and their data
   */
  let distros = [];
  fs.readdirSync(__dirname + '/../package-distros/')
    .forEach(filename => distros.push(filename));
  distros.push('[ INSTALL ]');
  distros.push('[ EXIT ]');
  return distros;
}
function getPkgJsonObj(distro) {
  let distroJson = fs.readFileSync(__dirname + `/../package-distros/${distro}`);
  let distroObj  = JSON.parse(distroJson);
  return distroObj;
}
function checkInstall() {
  console.info('Performing install...');
  childProcess.execSync(`echo "${rootPasswd}" | sudo -S apt-get install -y ${instQueue.join(' ')}`);
}

async function promptPkgDistros() {
  let distros = [];
  let message = 'Choose a distribution';
  let response;
  getPkgDistros()
    .forEach(element => distros.push({ title: element, value: element }));
  response = await prompts({
    type: 'select',
    name: 'value',
    message: message,
    choices: distros,
    initial: 0
  });
  return response.value;
}
async function promptPkgList(distro) {
  if (!distro)
    return;
  let distroObj = getPkgJsonObj(distro);
  let packages  = Object.keys(distroObj).map(key => 
    `${key} : ${distroObj[key]['package-desc']} : ${distroObj[key]['package-name']}`);
  let message   = "Choose the packages you will install";
  let response;
  response = await prompts({
    type: 'multiselect',
    name: 'values',
    choices: packages,
    message: message,
    initial: 0
  });
  if (response.values) {
    packages
      .filter((elmnt, index) => response.values.includes(index))
      .forEach(elmnt => instQueue.push(elmnt.slice(2 + elmnt.lastIndexOf(': '))));
  }
}