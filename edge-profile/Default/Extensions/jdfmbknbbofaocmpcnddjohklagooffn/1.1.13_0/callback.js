window.onload = function() {
    const query = window.location.search.substring(1);  // Extract the query parameters from the URL
    const params = new URLSearchParams(query);
    const code = params.get('code');
    const visitedUrl = params.get('state');
    const error = params.get('error');
    const errorDescription = params.get('error_description');
      if(!code){
        const messageDiv = document.querySelector('div');
         messageDiv.textContent = `Authentication Error: ${errorDescription || error}`;
        // chrome.runtime.sendMessage({
        //   type: 'okta_code',
        //   isError: true,  // Indicate that this is an error response
        //   error: error,  // Include the error type
        //   errorDescription: errorDescription,  // Include the error description
        //   visitedUrl: visitedUrl
        // });
        return;
      }
    if (code) {
      // Send the code and the visited URL to the background script
      chrome.runtime.sendMessage({
        type: 'okta_code',
        code: code,
        visitedUrl: visitedUrl
      });
       //window.close();  // Close the callback tab once the code is processed
    }
  
    
  };
  