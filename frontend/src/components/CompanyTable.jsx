import React from 'react'
import CompanyRow from './CompanyRow'

const CompanyTable = ({ companies, setCompanies }) => {
  return (
    <div className="dark-card shadow-lg overflow-hidden rounded-md border">
      <div className="overflow-x-auto">
        <table>
          <thead className="dark-accent">
            <tr>
              <th style={{ width: '100px' }}>
                Votes
              </th>
              <th>
                Company
              </th>
              <th>
                Founders
              </th>
              <th>
                Description
              </th>
              <th style={{ width: '120px' }}>
                Links
              </th>
            </tr>
          </thead>
          <tbody>
            {companies.map(company => (
              <CompanyRow 
                key={company.companyId || company.name.replace(/\s+/g, '')} 
                company={company} 
                companies={companies}
                setCompanies={setCompanies}
              />
            ))}
            {companies.length === 0 && (
              <tr>
                <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>
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