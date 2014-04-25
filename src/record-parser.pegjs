{
  var RID = require('../../../recordid');
}

Record "Record"
  = ws className:className? fields:fieldList {
      if (className) {
        fields['@class'] = className;
      }
      fields['@type'] = 'd';
      return fields;
    }


className "Class Name"
  = name:$([a-zA-Z][A-Za-z0-9]*) "@" {
    return name;
  }


field "Field"
  = name:fieldName ":" value:value? {
    return [name, value];
  }

fieldName "Field Name"
  = name:$([a-zA-Z][A-Za-z0-9]*) {
    return name;
  }

fieldList "Field List"
  = head:field tail:(ws "," ws field)* ws {
    var result = {}, total, i;
    result[head[0]] = head[1];
    if ((total = tail.length)) {
      for (i = 0; i < total; i++) {
        result[tail[i][3][0]] = tail[i][3][1];
      }
    }
    return result;
  }

value "Value"
  = recordId
  / null
  / boolean
  / date
  / number
  / array
  / set
  / map
  / embedded
  / twiceQuotedString
  / string


// ## Types

null = "null" { return null; }

recordId "Record ID"
  = "#" cluster:$[0-9]+ ":" position:$[0-9]+ {
    return new RID({
      cluster: +cluster,
      position: +position
    });
  }


// ## Arrays & Lists

array "array"
  = "[" head:value? tail:("," value)* "]" {
    var total = tail.length, i;
    if (head === null) {
      return [];
    }
    else if (total) {
      head = [head];
      for (i = 0; i < total; i++) {
        head.push(tail[i][1]);
      }
      return head;
    }
    else {
      return [head];
    }
  }

// ## Sets

set "set"
  = "<" head:value? tail:("," value)* ">" {
    var total = tail.length, i;
    if (head === null) {
      return [];
    }
    else if (total) {
      head = [head];
      for (i = 0; i < total; i++) {
        head.push(tail[i][1]);
      }
      return head;
    }
    else {
      return [head];
    }
  }


// ## Maps / Objects

map "map"
  = "{" fields:propertyList "}" {
    return fields;
  }

property "property"
  = name:string ":" value:value? {
    return [name, value];
  }


propertyList "property list"
  = head:property tail:(ws "," ws property)* ws {
    var result = {}, total, i;
    result[head[0]] = head[1];
    if ((total = tail.length)) {
      for (i = 0; i < total; i++) {
        result[tail[i][3][0]] = tail[i][3][1];
      }
    }
    return result;
  }

// ## Embedded

embedded "embedded"
  = "(" record:Record? ")" {
    return record;
  }

// ## Booleans

boolean "boolean"
  = false / true

false = "false" { return false; }
true  = "true"  { return true;  }


// ## Date
date "date"
  = c:$[0-9]+ t:[ta] {
    return new Date(+c);
  }


// ## Numbers

number "number"
  = c:$(minus? int frac? exp?) suf:[bslfdc]? {
    return parseFloat(c);
  }



decimal_point = "."
digit1_9      = [1-9]
e             = [eE]
exp           = e (minus / plus)? DIGIT+
frac          = decimal_point DIGIT+
int           = zero / (digit1_9 DIGIT*)
minus         = "-"
plus          = "+"
zero          = "0"



// ## Strings


string "string"
  = quotation_mark chars:$char* quotation_mark { return chars; }

twiceQuotedString "twice quoted string"
  = quotation_mark quotation_mark chars:$char* quotation_mark quotation_mark { return chars; }


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


ws "whitespace"
  = [ \t\n\r]*


DIGIT  = [0-9]
HEXDIG = [0-9a-f]i