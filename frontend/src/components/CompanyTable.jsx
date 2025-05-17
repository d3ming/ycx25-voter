import React, { useState } from 'react'
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid'
import CompanyRow from './CompanyRow'

const CompanyTable = ({ companies, setCompanies }) => {
  return (
    <div className="bg-dark-card shadow-lg overflow-hidden rounded-lg border border-dark-border">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-dark-border">
          <thead className="bg-dark-accent">
            <tr>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-24 sticky top-0">
                Votes
              </th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider sticky top-0">
                Company
              </th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider sticky top-0">
                Founders
              </th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider sticky top-0">
                Description
              </th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-32 sticky top-0">
                Links
              </th>
            </tr>
          </thead>
          <tbody className="bg-dark-card divide-y divide-dark-border">
            {companies.map(company => (
              <CompanyRow 
                key={company.companyId} 
                company={company} 
                companies={companies}
                setCompanies={setCompanies}
              />
            ))}
            {companies.length === 0 && (
              <tr>
                <td colSpan="5" className="px-3 py-10 text-center text-gray-400">
                  No companies found matching your search criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default CompanyTable