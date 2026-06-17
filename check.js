fetch('https://transfer-credit.vercel.app/login')
  .then(res => res.text())
  .then(text => {
    const matches = text.match(/family=([^&'"]+)/g);
    console.log(matches);
  });
