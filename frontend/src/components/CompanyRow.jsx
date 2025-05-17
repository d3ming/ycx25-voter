import React, { useState, useRef, useEffect } from 'react'
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid'

const CompanyRow = ({ company, companies, setCompanies }) => {
  const [showVoteInput, setShowVoteInput] = useState(false)
  const [voteValue, setVoteValue] = useState(company.votes || company.rank || 0)
  const [isUpdating, setIsUpdating] = useState(false)
  const [hasFlashEffect, setHasFlashEffect] = useState(false)
  const inputRef = useRef(null)

  // Handle clicking on the vote display to show input
  const handleVoteDisplayClick = () => {
    setShowVoteInput(true)
  }

  // Focus the input when it becomes visible
  useEffect(() => {
    if (showVoteInput && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [showVoteInput])

  // Handle vote input changes
  const handleVoteChange = (e) => {
    setVoteValue(parseInt(e.target.value) || 0)
  }

  // Handle Enter key press to submit form
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      submitVote()
    }
  }

  // Submit vote on blur
  const handleBlur = () => {
    submitVote()
  }

  // Submit vote to API
  const submitVote = async () => {
    setIsUpdating(true)
    try {
      const formData = new FormData()
      formData.append('rank', voteValue)

      const response = await fetch(`/update_rank/${company.name}`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json'
        },
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        
        // Update companies state to reflect the new vote count
        setCompanies(prevCompanies => 
          prevCompanies.map(c => 
            c.name === company.name ? { ...c, votes: data.votes } : c
          ).sort((a, b) => b.votes - a.votes)
        )
        
        // Flash effect
        setHasFlashEffect(true)
        setTimeout(() => setHasFlashEffect(false), 500)
      }
    } catch (error) {
      console.error('Error submitting vote:', error)
    } finally {
      setIsUpdating(false)
      setShowVoteInput(false)
    }
  }

  // Handle upvote/downvote
  const handleVote = async (voteType) => {
    setIsUpdating(true)
    try {
      const endpoint = voteType === 'up' ? `/upvote/${company.name}` : `/downvote/${company.name}`
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        
        // Update companies state to reflect the new vote count
        setCompanies(prevCompanies => 
          prevCompanies.map(c => 
            c.name === company.name ? { ...c, votes: data.votes } : c
          ).sort((a, b) => b.votes - a.votes)
        )
        
        // Update local vote value
        setVoteValue(data.votes)
        
        // Flash effect
        setHasFlashEffect(true)
        setTimeout(() => setHasFlashEffect(false), 500)
      }
    } catch (error) {
      console.error('Error handling vote:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <tr className="transition duration-150 ease-in-out hover:bg-[#2d2d2d]">
      <td className="px-3 py-3 whitespace-nowrap">
        <div className="flex items-center space-x-2">
          <div className="flex items-center">
            {showVoteInput ? (
              <input
                ref={inputRef}
                type="number"
                className="w-16 text-sm px-2 py-1 bg-dark-accent text-gray-200 border border-accent-blue rounded-md focus:outline-none focus:ring-1 focus:ring-accent-blue"
                value={voteValue}
                onChange={handleVoteChange}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                disabled={isUpdating}
              />
            ) : (
              <span 
                className={`font-semibold text-xl text-gray-200 cursor-pointer hover:text-accent-blue transition-colors duration-200 ${hasFlashEffect ? 'vote-updated' : ''}`}
                onClick={handleVoteDisplayClick}
              >
                {company.votes}
              </span>
            )}
          </div>
          <div className="flex flex-col space-y-1 ml-2">
            <button 
              onClick={() => handleVote('up')} 
              className="text-gray-400 hover:text-accent-green focus:outline-none transition-colors duration-200" 
              title="Upvote"
              disabled={isUpdating}
            >
              <ArrowUpIcon className="h-4 w-4" />
            </button>
            <button 
              onClick={() => handleVote('down')} 
              className="text-gray-400 hover:text-accent-red focus:outline-none transition-colors duration-200" 
              title="Downvote"
              disabled={isUpdating}
            >
              <ArrowDownIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </td>
      <td className="px-3 py-3 whitespace-nowrap">
        <div className="flex flex-col">
          <div className="text-sm font-medium">
            <a 
              href={company.website} 
              target="_blank" 
              className="text-accent-blue hover:text-blue-400 transition-colors duration-200"
            >
              {company.name}
            </a>
          </div>
        </div>
      </td>
      <td className="px-3 py-3 whitespace-nowrap">
        <div className="text-xs text-gray-400">
          {company.founders && company.founders.map((founder, index) => (
            <div key={index}>
              <a 
                href={founder.linkedin} 
                target="_blank" 
                className="hover:text-accent-blue transition-colors duration-200"
              >
                {founder.name}
              </a>
            </div>
          ))}
        </div>
      </td>
      <td className="px-3 py-3">
        <div className="text-xs text-gray-300 max-w-md">
          {company.description}
        </div>
      </td>
      <td className="px-3 py-3 whitespace-nowrap text-xs font-medium">
        <div className="flex space-x-2">
          <a 
            href={company.website_url} 
            target="_blank" 
            className="text-gray-400 hover:text-accent-blue transition-colors duration-200 flex items-center"
          >
            <i className="fas fa-globe mr-1"></i> Web
          </a>
          {company.company_linkedin && (
            <a 
              href={company.company_linkedin} 
              target="_blank" 
              className="text-gray-400 hover:text-accent-blue transition-colors duration-200 flex items-center"
            >
              <i className="fab fa-linkedin mr-1"></i> LinkedIn
            </a>
          )}
        </div>
      </td>
    </tr>
  )
}

export default CompanyRow