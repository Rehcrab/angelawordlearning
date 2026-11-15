// ============================================================================
//  CONFIG  ->  THIS IS THE FILE WHERE YOU PASTE YOUR DEEPSEEK API KEY
// ============================================================================
//
//  1. Replace the text  YOUR_API_KEY_HERE  below (keep the quotes) with your
//     DeepSeek API key.  You can get one at  https://platform.deepseek.com
//
//  2. That's it.  Open index.html (or run `node server.js`) and generate.
//
//  NOTE ON CORS:
//    Calling the DeepSeek API straight from a web page is often blocked by the
//    browser (CORS).  This app automatically falls back to a tiny local proxy
//    if you start it with:   node server.js   then open  http://localhost:3000
//    The proxy just forwards your request (and your key) to DeepSeek.
//
// ============================================================================

window.CONFIG = {
  // >>> PASTE YOUR KEY HERE <<<
  API_KEY: "YOUR_API_KEY_HERE",

  // The model to use.
  MODEL: "deepseek-flash",

  // Direct DeepSeek chat endpoint.
  // (If your DeepSeek account only supports the classic models, you can change
  //  MODEL above to "deepseek-chat" or "deepseek-reasoner".)
  API_URL: "https://api.deepseek.com/chat/completions",

  // Higher = more varied questions/sentences. 1.3 works well for worksheets.
  TEMPERATURE: 1.3,
};
