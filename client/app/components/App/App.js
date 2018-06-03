import React, { Component } from 'react';

import Header from '../Header/Header';
import Footer from '../Footer/Footer';

const App = ({ children }) => (
  <div>
    <main>
      {children}
    </main>
  </div>
);

export default App;
