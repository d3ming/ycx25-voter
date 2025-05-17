import React from 'react'

const Header = ({ searchTerm, handleSearchChange, companyCount }) => {
  return (
    <header className="header">
      <div className="container flex flex-col items-center justify-between py-4">
        <h1 className="text-2xl font-bold text-white mb-2">
          <span className="text-accent-blue">YC</span> X25 Batch Companies
        </h1>
        <div className="text-sm text-gray-400">
          <span className="bg-dark-accent rounded-full px-3 py-1">
            {companyCount.total} companies
          </span> 
          <span className="ml-2">Sorted by votes</span>
        </div>
      </div>
      
      <div className="container py-2">
        <div className="flex items-center">
          <div className="relative" style={{ flexGrow: 1, maxWidth: '500px' }}>
            <input 
              type="text" 
              id="search-filter" 
              placeholder="Search by company or founder name..." 
              className="rounded-md"
              style={{ width: '100%', paddingLeft: '2.5rem' }}
              value={searchTerm}
              onChange={handleSearchChange}
            />
            <div style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}>
              <i className="fas fa-search text-gray-400"></i>
            </div>
          </div>
          <div className="flex items-center">
            <span id="filter-count" className="text-sm text-gray-400 ml-2">
              {searchTerm === '' 
                ? 'Showing all companies' 
                : `Showing ${companyCount.filtered} of ${companyCount.total} companies`}
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header