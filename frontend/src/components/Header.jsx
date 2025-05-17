import React from 'react'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'

const Header = ({ searchTerm, handleSearchChange, companyCount }) => {
  return (
    <header className="bg-dark-header border-b border-dark-border sticky top-0 z-10 shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center">
        <h1 className="text-2xl font-bold text-white mb-2 sm:mb-0">
          <span className="text-accent-blue">YC</span> X25 Batch Companies
        </h1>
        <div className="text-sm text-gray-400">
          <span className="bg-dark-accent rounded-full px-3 py-1">
            {companyCount.total} companies
          </span> 
          <span className="ml-2">Sorted by votes</span>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 py-2 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-grow max-w-md">
            <input 
              type="text" 
              id="search-filter" 
              placeholder="Search by company or founder name..." 
              className="w-full bg-dark-accent text-gray-200 border border-dark-border rounded-md py-2 pl-10 pr-4 focus:outline-none focus:ring-1 focus:ring-accent-blue"
              value={searchTerm}
              onChange={handleSearchChange}
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
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