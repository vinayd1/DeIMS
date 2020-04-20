import React from 'react'

const Loader = ({className}) => <div className="d-flex justify-content-center">
  <div className={`spinner-border ${className || ''}`}>
    <span className="sr-only">Loading...</span>
  </div>
</div>

export default Loader