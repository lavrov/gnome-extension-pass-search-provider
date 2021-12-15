const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const { Gio, GLib } = imports.gi;
const { main } = imports.ui;
const util = imports.misc.util;
const St = imports.gi.St;

const Clipboard = St.Clipboard.get_default();
const CLIPBOARD_TYPE = St.ClipboardType.CLIPBOARD;
const icon = Gio.icon_new_for_string(`${Me.dir.get_path()}/icon.svg`);


function init() {
  log(`Initializing ${Me.metadata.name}`);
  return new Extension();
}


class Extension {
  constructor() { }

  enable() {
    log(`Enabling ${Me.metadata.name}`);
    this.instance = new SearchProvider;
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


class SearchProvider {

  appInfo = {
    get_name: () => `Pass`,
    get_icon: () => icon,
    get_id: () => `pass-search-provider`,
    should_show: () => true,
  }

  getInitialResultSet(terms, cb) {
    this.fileTree = new PassStoreFileTree;
    cb(this._searchInFileTree(terms));
  }

  getSubsearchResultSet(_, terms, cb) {
    cb(this._searchInFileTree(terms));
  }

  _searchInFileTree(terms) {
    let longEnough = terms.filter(term => term.length >= 2).length > 0
    if (longEnough) {
      return this.fileTree.find(terms);
    } else {
      return [];
    }
  }

  getResultMetas(results, cb) {
    let getMeta = (entry) => {
      let info = this.fileTree.get(entry);
      return {
        id: entry,
        name: info.shortName,
        description: info.directory,
        createIcon() { return null },
      }
    };
    cb(results.map(getMeta));
  }

  activateResult(entry) {
    let sub = Gio.Subprocess.new(['pass', 'show', entry], Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE);
    sub.communicate_utf8_async(null, null, (_, res) => {
      let [ok, stdout, stderr] = sub.communicate_utf8_finish(res);
      let message;
      if (stderr) {
        message = stderr;
      } else {
        let lines = stdout.split(/\r?\n/);
        Clipboard.set_text(CLIPBOARD_TYPE, lines[0]);
        message = `Copied ${entry} to clipboard`;
      }
      main.notify("Pass", message);
    });
  }

  filterResults(providerResults, maxResults) {
    return providerResults.slice(0, maxResults);
  }
}


class PassStoreFileTree {

  constructor() {
    let storePath = GLib.build_filenamev([GLib.get_home_dir(), ".password-store"]);
    let storeRootDir = Gio.File.new_for_path(storePath);
    this.entries = [];
    this.files = {};
    for (const [name, file] of enumerateGpgFiles(storeRootDir, [])) {
      let path = storeRootDir.get_relative_path(file).slice(0, -4); // remove .gpg part
      let directory = storeRootDir.get_relative_path(file.get_parent());
      let shortName = name.slice(0, -4);
      this.entries.push(path)
      this.files[path] = {
        shortName,
        directory,
        file
      };
    }
  }

  find(terms) {
    return this.entries.filter(f => terms.every(term => f.includes(term)));
  }

  get(entry) {
    return this.files[entry];
  }
}


function enumerateGpgFiles(dir, result) {
  let enumerator = dir.enumerate_children('standard::name,standard::type', Gio.FileQueryInfoFlags.NONE, null);
  let info;
  while ((info = enumerator.next_file(null))) {
    let type = info.get_file_type();
    let name = info.get_name();
    let child = enumerator.get_child(info);
    if (type == Gio.FileType.REGULAR && name.endsWith('.gpg')) {
      result.push([name, child]);
    }
    else if (type == Gio.FileType.DIRECTORY && !info.get_is_hidden())
      enumerateGpgFiles(child, result);
  }
  return result;
}
