var fs = require('fs');

var defs = [];

exports.define = function(def) {
  defs.push(def);
}

exports.process = function(c, filename) {
  c = String(c);
  function includes(c, filename) {
    var regexp = /#include ([a-zA-Z0-9 \?\\\/\-\_\+\=\*\&\^\%\$\[\]\(\)\:\;\@\!\.\'\"]+)/;
    var regex_res = regexp.exec(c);
    while (regex_res !== null) {
      var str = regex_res[1];
      if (str === '' || str === null) {
        return new Error('Error while preprocessing file: include statement must not be empty.');
      }

      if (str.substring(0, 1) === '<') {
        if (str.substring(str.length - 1) !== '>') {
          return new Error('Error while preprocessing file: incomplete include statement.');
        }

        var file = str.substring(1);
        file = file.substring(0, file.length - 1);

        if (file === '') {
          return new Error('Error while preprocessing file: include statement must contain a filename to include.');
        }

        var file_found = false;
        var file_path = '';

        try {
          // make sure the file exists:
          fs.statSync('/usr/include/' + file); // if it doesn't throw, the file exists.
          file_found = true;
          file_path = '/usr/include/';
        } catch(e) {
          // do nothing
        }

        try {
          if (file_found === false) {
            // make sure the file exists:
            fs.statSync('/usr/local/include/' + file); // if it doesn't throw, the file exists.
            file_found = true;
            file_path = '/usr/local/include/';
          }
        } catch(e) {
          // do nothing
        }

        if (file_found === false) {
          return new Error('Error while preprocessing file: the file \'' + file + '\' was not found.');
        }

        var cont = fs.readFileSync(file_path + file);
        var ret = exports.process(cont, file_path + file);
        c = c.replace(regexp, ret);
      } else if (str.substring(0, 1) === '"') {
        if (str.substring(str.length - 1) !== '"') {
          return new Error('Error while preprocessing file: incomplete include statement.');
        }

        var file = str.substring(1);
        file = file.substring(0, file.length - 1);

        if (file === '') {
          return new Error('Error while preprocessing file: include statement must contain a filename to include.');
        }

        try {
          var path = require('path').dirname(filename);
          // make sure the file exists:
          fs.statSync(path + '/' + file); // if it doesn't throw, the file exists.
          var cont = fs.readFileSync(path + '/' + file);
          var ret = exports.process(cont, path + '/' + file);
          c = c.replace(regexp, ret);
        } catch(e) {
          return new Error('Error while preprocessing file: no such local file: \'' + file + '\'.');
        }
      }
      regex_res = regexp.exec(c);
    }

    return c;
  }

  function defines(c) {
    var ret = [];
    var regexp = /\#define ([a-zA-Z0-9_$]+)(\([ ]?[a-zA-Z0-9,_$ ]+[ ]?\))?[ ]?([a-zA-Z0-9 \#\?\\\/\-\_\+\=\*\&\^\^\%\$\[\]\(\)\:\;\@\!\.\'\"]+)?/;
    var regex_res = regexp.exec(c);
    while (regex_res !== null) {
      var macro = regex_res[1];
      var params = regex_res[2] || null;
      var replace = regex_res[3] || null;

      ret.push({
        macro: macro,
        params: params,
        replace: replace
      });

      c = c.replace(regexp, '');

      regex_res = regexp.exec(c);
    }
    
    return {
      c: c,
      ret: ret
    };
  }

  function replace_defines(c, defs) {
    for (var i = 0; i < defs.length; i++) {
      var obj = defs[i];
      if (obj.replace) {
        if (obj.params) {
          var param_str = obj.params.replace(/ /g, ''); // remove all whitespace from parameters
          param_str = param_str.substring(1);
          param_str = param_str.substring(0, param_str.length - 1);
          var param_arr = (param_str.indexOf(',') > -1) ? param_str.split(',') : [param_str];
          var regexp = new RegExp(obj.macro + '(\\([ ]?[a-zA-Z0-9,_$ ]+[ ]?\\))');
          var regex_res = regexp.exec(c);
          while (regex_res !== null) {
            var str = regex_res[1].replace(/ /g, ''); // remove all whitespace from parameters
            str = str.substring(1);
            str = str.substring(0, str.length - 1);
            var arr = (str.indexOf(',') > -1) ? str.split(',') : [str];
            var tmp_string = obj.replace;
            for (var j = 0; j < param_arr.length; j++) {
              var i = 0;
              do {
                tmp_string = tmp_string.replace(param_arr[j], arr[j]);
                tmp_string = tmp_string.replace('##' + param_arr[j], arr[j]);
                tmp_string = tmp_string.replace('#@' + param_arr[j], '\'' + arr[j].substring(0, 1) + '\'');
                tmp_string = tmp_string.replace('#' + param_arr[j], '"' + arr[j] + '"');
              } while ((i = tmp_string.indexOf(param_arr[j], i + 1)) > -1);
            }
            c = c.replace(regexp, tmp_string);
            regex_res = regexp.exec(c);
          }
        }

        var regexp = new RegExp(obj.macro, 'g');
        c = c.replace(regexp, obj.replace);
      }
    }

    return c;
  }

  function ifdefs(c, defs) {
    for (var i = 0; i < defs.length; i++) {
      var obj = defs[i];
      var regexp = new RegExp('#ifdef ' + obj.macro + '$([\\s\\S]*?)#endif', 'gm');
      var regex_res = regexp.exec(c);
      if (regex_res) {
        var text = regex_res[1];
        if (text.indexOf('#else') > -1) {
          text = text.split('#else')[0];
        }
        c = c.replace(regexp, text);
      }
    }

    // if it was not replaced already, it means the macro is not defined, so replace it with the 'else' (if it's there)
    var regexp = new RegExp('#ifdef ([a-zA-Z0-9_$]+)$([\\s\\S]*?)#endif', 'm');
    var regex_res = regexp.exec(c);
    while (regex_res !== null) {
      var text = regex_res[2];
      if (text.indexOf('#else') > -1) {
        text = text.split('#else')[1];
      } else {
        text = '';
      }
      c = c.replace(regexp, text);
      regex_res = regexp.exec(c);
    }

    return c;
  }

  function ifndefs(c, defs) {
    for (var i = 0; i < defs.length; i++) {
      var obj = defs[i];
      var regexp = new RegExp('#ifndef ' + obj.macro + '$([\\s\\S]*?)#endif', 'gm');
      var regex_res = regexp.exec(c);
      if (regex_res) {
        var text = regex_res[1];
        if (text.indexOf('#else') > -1) {
          text = text.split('#else')[1];
        } else {
          text = '';
        }
        c = c.replace(regexp, text);
      }
    }

    // if it was not replaced already, it means the macro is not defined, so replace it
    var regexp = new RegExp('#ifndef ([a-zA-Z0-9_$]+)$([\\s\\S]*?)#endif', 'm');
    var regex_res = regexp.exec(c);
    while (regex_res !== null) {
      var text = regex_res[2];
      if (text.indexOf('#else') > -1) {
        text = text.split('#else')[0];
      }
      c = c.replace(regexp, text);
      regex_res = regexp.exec(c);
    }

    return c;
  }

  c = includes(c, filename);
  var def = defines(c);
  for (var i = 0; i < def.ret.length; i++) {
    defs.push(def.ret[i]);
  }
  c = def.c;
  c = ifdefs(c, defs);
  c = ifndefs(c, defs);
  c = replace_defines(c, defs);

  return c;
};