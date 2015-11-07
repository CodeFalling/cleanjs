var Lex = require('./src/lex');
var fs = require('fs');

var InputStream = Lex.InputStream;
var TokenStream = Lex.TokenStream;

//var code = fs.readFileSync('./src/lex.js', "utf8");
var code = `var name = "hahaha\\n";
for (var i = 0; i++; i<10){
  console.log(name + i);
}
`;
var is = InputStream(code);
var ts = TokenStream(is);

while(!ts.eof()){
  console.log(ts.next());
}
