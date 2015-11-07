"use strict";

module.exports = {
  InputStream: InputStream,
  TokenStream: TokenStream
};


function InputStream(input) {
  var _pos = 0,
    _line = 0,
    _col = 0,
    _input = input;

  return {
    next: next,
    peek: peek,
    eof: eof,
    throwerr: throwerr,
    lookup_next: lookup_next,
    get_line: get_line,
    get_col: get_col
  };

  function get_line() {
    return _line;
  }

  function get_col() {
    return _col;
  }

  function next() {
    var ch = _input.charAt(_pos++);
    if (ch == '\n') {
      _line++;
      _col = 0;
    } else {
      _col++;
    }
    return ch;
  }

  function lookup_next() {
    var ch = _input.charAt(_pos + 1);
    if (ch == '') {
      return null;
    } else {
      return ch;
    }
  }

  function peek() {
    return _input.charAt(_pos);
  }

  function eof() {
    return peek() == '';
  }

  function throwerr(msg) {
    throw new Error(`[${_line}:${_col}]${msg}`);
  }
};

function TokenStream(input_stream) {

  /*
   { type: "punc", value: "(" }           // punctuation: (){},;:
   { type: "num", value: 5 }              // numbers
   { type: "str", value: "Hello World!" } // strings
   { type: "kw", value: "lambda" }        // keywords: if then else lambda true false
   { type: "iden", value: "a" }            // identifiers
   { type: "op", value: "!=" }            // operators: < > != = == || && .
    */
  var _input_stream = input_stream;
  var _current = null;
  var _keywords = ['if', 'return', 'else', 'function', 'var', 'null', 'true', 'false', 'while', 'for'];
  return {
    next: next,
    peek: peek,
    eof: eof,
    throwerr: _input_stream.throwerr
  };

  function create_info() {
    return {
      line: _input_stream.get_line(),
      col: _input_stream.get_col()
    };
  }

  function is_whitespace(ch) {
    return " \t\n".indexOf(ch) >= 0;
  }

  function read_while(cond_func) {
    var buffer = '';
    while (!_input_stream.eof() && cond_func(_input_stream.peek())) {
      buffer += _input_stream.next();
    }
    return buffer;
  }

  function skip_comment() {
    _input_stream.next();
    if (_input_stream.peek() == '/') {
      skip_line_comment();
    } else {
      skip_block_comment();
    }
  }

  function skip_block_comment() {
    function is_not_matching(ch) { // */
      return !(ch == '*' && _input_stream.lookup_next() == '/');
    }
    read_while(is_not_matching);
    _input_stream.next();
    _input_stream.next();
  }

  function skip_line_comment() {
    function is_not_next_line(ch) {
      return ch != '\n';
    }
    read_while(is_not_next_line);
    _input_stream.next();
  }

  function is_op_char(ch) {
    return '+-*/=&|<>!.'.indexOf(ch) >= 0;
  }

  function is_id_start(ch) {
    return RegExp('[a-z_]', 'i').test(ch);
  }

  function is_string_start(ch) {
    return ch == '"' || ch == "'" || ch == '`';
  }

  function is_number_start(ch) {
    return '0123456789'.indexOf(ch) >= 0;
  }

  function is_comment_start(ch) {
    var next_ch = _input_stream.lookup_next();
    return ch == '/' && (next_ch == '/' || next_ch == '*');
  }

  function is_punc(ch) {
    return ",;(){}[]:".indexOf(ch) >= 0;
  }

  function is_keywords(str) {
    return _keywords.indexOf(str) >= 0;
  }

  function is_id(ch) {
    return is_id_start(ch) || "0123456789".indexOf(ch) >= 0;
  }

  function read_op() {
    return {
      type: 'op',
      value: read_while(is_op_char)
    };
  }

  function read_number() {
    var has_dot = false;
    var number = read_while(function(ch) {
      if (ch == ".") {
        if (has_dot) return false;
        has_dot = true;
        return true;
      }
      return is_number_start(ch);
    });
    return {
      type: "num",
      value: parseFloat(number)
    };
  }

  function read_escaped(end) {
    var escaped = false;
    var str = '';
    _input_stream.next();
    while (!_input_stream.eof()) {
      var ch = _input_stream.next();
      if (escaped) {
        if(ch == 'n'){
          str += '\n';
        }else{
          str += ch;
        }
        escaped = false;
      } else if (ch == "\\") {
        escaped = true;
      } else if (ch == end) {
        break;
      } else {
        str += ch;
      }
    }
    return str;
  }

  function read_string() {
    var type;
    var begin = _input_stream.peek();
    if(begin == '`')
      type = 'es6_string';
    else
      type = 'string';
    return {
      type: type,
      value: read_escaped(begin) // begin with ' or " or `
    };
  }

  function read_id_or_keyword() {
    var str = read_while(is_id);
    if (is_keywords(str)) {
      return {
        type: 'keyword',
        value: str
      };
    } else return {
      type: 'iden',
      value: read_while(is_id)
    };
  }

  function read_punc() {
    return {
      type: 'punc',
      value: _input_stream.next()
    };
  }

  function read_next() {
    read_while(is_whitespace);
    var result;
    var info = create_info();
    if (_input_stream.eof()) {
      return null;
    }
    var ch = _input_stream.peek();
    if (is_comment_start(ch)) {
      skip_comment();
      result = read_next();
    }
    else if (is_op_char(ch)) result = read_op();
    else if (is_string_start(ch)) result = read_string();
    else if (is_id_start(ch)) result = read_id_or_keyword();
    else if (is_punc(ch)) result = read_punc();
    else if (is_number_start(ch)) result = read_number();
    else _input_stream.throwerr(`Can't handle character: ${ch}`);
    result.info = info;
    return result;
  }

  function next() {
    var current = _current;
    _current = read_next();
    return current;
  }

  function peek() {
    if (_current == null)
      _current = read_next();
    return _current;
  }

  function eof() {
    return peek() == null;
  }
};
