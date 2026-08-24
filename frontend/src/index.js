import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Measures Core Web Vitals. Pass a reporter (a logger, or a POST to an
// analytics endpoint) to do something with the numbers; called bare, it
// collects nothing. https://bit.ly/CRA-vitals
reportWebVitals();
