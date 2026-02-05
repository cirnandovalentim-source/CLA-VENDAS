
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

// Remove loader function
const removeLoader = () => {
    const loader = document.getElementById('initial-loader');
    if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => {
            loader.remove();
        }, 500);
    }
};

try {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  
  // Cleanup loader after mount attempt
  // Using setTimeout to give React a frame to paint
  setTimeout(removeLoader, 100);

} catch (error) {
  console.error("Critical Render Error:", error);
  throw error; // Let window.onerror handle it
}
