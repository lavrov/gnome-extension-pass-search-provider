const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const { Gio, GLib } = imports.gi;
const { main } = imports.ui;
const util = imports.misc.util;

const icon = Gio.icon_new_for_string(`${Me.dir.get_path()}/icon.svg`);


function init() {
  log(`Initializing ${Me.metadata.name}`);
  return new Extension();
}


class Extension {
  constructor() {
  }

  enable() {
    log(`Enabling ${Me.metadata.name}`);
    this.instance = Object.create(searchProvider);
    getOverviewSearchResult()._registerProvider(this.instance);
  }

  disable() {
    log(`Disabling ${Me.metadata.name}`);
    getOverviewSearchResult()._unregisterProvider(this.instance);
  }
}


function getOverviewSearchResult() {
  if (main.overview.viewSelector !== undefined) {
    return main.overview.viewSelector._searchResults;
  } else {
    return main.overview._overview.controls._searchController._searchResults;
  }
}


const searchProvider = {
  appInfo: {
    get_name: () => `Pass`,
    get_icon: () => icon,
    get_id: () => `pass-search-provider`,
    should_show: () => true,
  },

  getInitialResultSet(terms, cb) {
    let path = GLib.build_filenamev([GLib.get_home_dir(), ".password-store"]);
    let passStoreRoot = Gio.File.new_for_path(path);
    let files = enumeratePassFiles(passStoreRoot, passStoreRoot, []);
    files = files.filter(f => f.includes(terms));
    cb(files);
  },

  getSubsearchResultSet(_, terms, cb) {
    this.getInitialResultSet(terms, cb);
  },

  getResultMetas(results, cb) {
    cb(results.map(getResultMeta));
  },

  activateResult(passwordPath) {
    let sub = Gio.Subprocess.new(['pass', 'show', '-c', passwordPath], Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE);
    sub.communicate_utf8_async(null, null, (_, res) => {
      let [ok, stdout, stderr] = sub.communicate_utf8_finish(res);
      main.notify('Pass', stdout || stderr);
    });
  },

  filterResults(providerResults, maxResults) {
    return providerResults.slice(0, maxResults);
  }
};


function getResultMeta(id) {
  return {
    id: id,
    name: id,
    createIcon() { return null },
  };
}


function enumeratePassFiles(root, dir, result) {
  let enumerator = dir.enumerate_children('standard::name,standard::type', Gio.FileQueryInfoFlags.NONE, null);
  let info;
  while ((info = enumerator.next_file(null))) {
    let type = info.get_file_type();
    let name = info.get_name();
    let child = enumerator.get_child(info);
    if (type == Gio.FileType.REGULAR && name.endsWith('.gpg')) {
      let path = root.get_relative_path(child).slice(0, -4);
      result.push(path);
    }
    else if (type == Gio.FileType.DIRECTORY && !info.get_is_hidden())
      enumeratePassFiles(root, child, result);
  }
  return result;
}
