DOCUMENT
  = className:CLASS_NAME? fields:FIELD_LIST {
    if (className) {
      fields['@class'] = className;
    }
    return fields;
  }

CLASS_NAME
  = name:$([a-zA-Z][A-Za-z0-9]*) "@" {
    return name;
  }

INT
  = d:DIGIT+ {
    return +d;
  }

FIELD
  = name:FIELD_NAME ":" value:FIELD_VALUE {
    return [name, value];
  }

FIELD_NAME
  = name:$([a-zA-Z][A-Za-z0-9]*) {
    return name;
  }

FIELD_LIST
  = head:FIELD tail:("," FIELD)* {
    var result = {};
    result[head[0]] = head[1];
    if (tail) {
      var total = tail.length,
          i;
      for (i = 0; i < total; i++) {
        result[tail[i][1][0]] = tail[i][1][1];
      }
    }
    return result;
  }

FIELD_VALUE
  = string

DIGIT  = [0-9]
HEXDIG = [0-9a-f]i


string "string"
  = quotation_mark chars:char* quotation_mark { return chars.join(""); }

char
  = unescaped
  / escape
    sequence:(
        '"'
      / "\\"
      / "/"
      / "b" { return "\b"; }
      / "f" { return "\f"; }
      / "n" { return "\n"; }
      / "r" { return "\r"; }
      / "t" { return "\t"; }
      / "u" digits:$(HEXDIG HEXDIG HEXDIG HEXDIG) {
          return String.fromCharCode(parseInt(digits, 16));
        }
    )
    { return sequence; }


escape         = "\\"
quotation_mark = '"'
unescaped      = [\x20-\x21\x23-\x5B\x5D-\u10FFFF]
