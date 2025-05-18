// Function to handle ranking through AJAX
async function handleRank(companyId, rankType) {
    try {
        // Get the current rank element
        const rankDisplayElement = document.getElementById(`voteDisplay${companyId}`);
        
        // Get current rank value
        const currentRank = parseInt(rankDisplayElement.textContent || '0', 10);
        
        // Update UI immediately for responsive feel (optimistic update)
        // For ranking, "promote" means decreasing the number (better rank), "demote" means increasing
        let newRank;
        if (rankType === 'promote') {
            // Don't allow rank below 1 (1 is the highest rank)
            newRank = Math.max(1, currentRank - 1);
        } else {
            // For demote, increase the rank number
            newRank = currentRank + 1;
        }
        
        // If the optimistic update didn't change anything, don't continue
        if (newRank === currentRank) {
            // Can't promote any higher than 1
            if (rankType === 'promote') {
                rankDisplayElement.classList.add('vote-updated');
                setTimeout(() => {
                    rankDisplayElement.classList.remove('vote-updated');
                }, 500);
            }
            return;
        }
        
        // Update the display right away
        rankDisplayElement.textContent = newRank;
        
        // Show feedback animation right away
        rankDisplayElement.classList.add('vote-updated');
        setTimeout(() => {
            rankDisplayElement.classList.remove('vote-updated');
        }, 500);
        
        // Determine the endpoint based on rank change type
        // We'll reuse the upvote/downvote endpoints but with inverted logic
        // Since lower rank is better, promote = downvote and demote = upvote
        const endpoint = rankType === 'promote' ? `/downvote/${companyId}` : `/upvote/${companyId}`;
        
        // Make API call in background
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        
        if (response.ok) {
            // Get the actual updated rank from server
            const data = await response.json();
            
            // Update to server value (only if different from our optimistic update)
            if (data.votes !== newRank) {
                rankDisplayElement.textContent = data.votes;
            }
        } else {
            // If there was an error, rollback to original value
            console.error('Error updating rank:', response.statusText);
            rankDisplayElement.textContent = currentRank;
            
            // Show error indicator
            rankDisplayElement.classList.add('vote-error');
            setTimeout(() => {
                rankDisplayElement.classList.remove('vote-error');
            }, 500);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// Function to handle manual rank setting
async function submitVote(companyId) {
    try {
        const rankInput = document.getElementById(`voteInput${companyId}`);
        let rankValue = parseInt(rankInput.value, 10);
        const rankDisplay = document.getElementById(`voteDisplay${companyId}`);
        
        // Ensure rank is at least 1 (1 is the highest rank)
        if (rankValue < 1) {
            rankValue = 1;
        }
        
        // Update display immediately (optimistic update)
        rankDisplay.textContent = rankValue;
        
        // Hide input, show display
        rankDisplay.classList.remove('hidden');
        document.getElementById(`voteForm${companyId}`).classList.add('hidden');
        
        // Flash effect immediately for responsiveness
        rankDisplay.classList.add('vote-updated');
        setTimeout(() => {
            rankDisplay.classList.remove('vote-updated');
        }, 500);
        
        // Make API call in background
        const response = await fetch(`/update_rank/${companyId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            body: `rank=${rankValue}`
        });
        
        if (response.ok) {
            // Get updated data
            const data = await response.json();
            
            // Update display only if different from our optimistic update
            if (data.votes !== rankValue) {
                rankDisplay.textContent = data.votes;
            }
        } else {
            console.error('Error updating rank:', response.statusText);
            // Show error indicator
            rankDisplay.classList.add('vote-error');
            setTimeout(() => {
                rankDisplay.classList.remove('vote-error');
            }, 500);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// Show vote input when clicking on vote display
function showVoteInput(companyId) {
    const displayElem = document.getElementById('voteDisplay' + companyId);
    const formElem = document.getElementById('voteForm' + companyId);
    const inputElem = document.getElementById('voteInput' + companyId);
    
    displayElem.classList.add('hidden');
    formElem.classList.remove('hidden');
    inputElem.focus();
    inputElem.select();
}

// Handle Enter key in vote input
function handleEnterKey(event, companyId) {
    if (event.key === 'Enter') {
        event.preventDefault();
        submitVote(companyId);
    }
}

// Handle blur event on vote input
function handleVoteBlur(companyId) {
    submitVote(companyId);
}

// Function to handle tier changes using AJAX
async function handleTierChange(companyId, tier) {
    try {
        // Get the select element
        const tierSelect = document.getElementById(`tierSelect${companyId}`);
        
        // Store original tier value in case of error
        const originalTier = tierSelect.getAttribute('data-original-tier') || tier;
        
        // Apply visual feedback
        tierSelect.classList.add('bg-accent-blue');
        setTimeout(() => {
            tierSelect.classList.remove('bg-accent-blue');
        }, 500);
        
        // Make API call to update tier
        const response = await fetch(`/update_tier/${companyId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            body: `tier=${tier}`
        });
        
        if (response.ok) {
            // Get updated data
            const data = await response.json();
            
            // Store the new tier as the original for future reference
            tierSelect.setAttribute('data-original-tier', data.tier);
            
            // Fetch updated companies data to refresh the table
            fetchAndUpdateCompanies();
        } else {
            console.error('Error updating tier:', response.statusText);
            
            // Revert to original tier
            tierSelect.value = originalTier;
            
            // Show error
            tierSelect.classList.add('bg-accent-red');
            setTimeout(() => {
                tierSelect.classList.remove('bg-accent-red');
            }, 500);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// Function to fetch updated companies and refresh the table
async function fetchAndUpdateCompanies() {
    try {
        // Save current scroll position
        const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
        
        // Fetch the updated companies data
        const response = await fetch('/api/companies', {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (response.ok) {
            const companiesData = await response.json();
            
            // Get the table body
            const tableBody = document.querySelector('tbody');
            
            // Save current focus element
            const activeElement = document.activeElement;
            const activeId = activeElement ? activeElement.id : null;
            
            // Temporarily highlight the table body
            tableBody.style.transition = 'background-color 0.2s';
            tableBody.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
            
            // Clear existing rows
            tableBody.innerHTML = '';
            
            // Create new rows for each company
            console.log('Total companies to render:', companiesData.length);
            
            // Count companies by tier for debugging
            const tierCounts = {};
            companiesData.forEach(c => {
                tierCounts[c.tier] = (tierCounts[c.tier] || 0) + 1;
            });
            console.log('Companies by tier:', tierCounts);
            
            // Log tier D companies for debugging
            const tierDCompanies = companiesData.filter(c => c.tier === 'D');
            console.log('Tier D companies:', tierDCompanies.length, tierDCompanies.map(c => c.name));
            
            companiesData.forEach(company => {
                const row = document.createElement('tr');
                row.className = 'company-row transition duration-150 ease-in-out';
                
                // Create tier/rank cell
                const tierRankCell = document.createElement('td');
                tierRankCell.className = 'px-3 py-3 whitespace-nowrap';
                tierRankCell.innerHTML = `
                    <div class="flex items-center space-x-2">
                        <div class="flex items-center flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-3">
                            <!-- Tier dropdown -->
                            <div class="flex items-center">
                                <select id="tierSelect${company.id}" data-original-tier="${company.tier}" class="text-sm w-12 px-1 py-1 bg-dark-accent text-gray-200 border border-dark-border rounded-md focus:outline-none focus:ring-1 focus:ring-accent-blue" onchange="handleTierChange('${company.id}', this.value)">
                                    <option value="A" ${company.tier === 'A' ? 'selected' : ''}>A</option>
                                    <option value="B" ${company.tier === 'B' ? 'selected' : ''}>B</option>
                                    <option value="C" ${company.tier === 'C' ? 'selected' : ''}>C</option>
                                    <option value="D" ${company.tier === 'D' ? 'selected' : ''}>D</option>
                                </select>
                                <span class="mx-2 text-gray-500">/</span>
                            </div>
                            
                            <!-- Rank controls -->
                            <div class="flex items-center">
                                <div id="voteForm${company.id}" class="hidden">
                                    <input type="number" id="voteInput${company.id}" min="1" class="vote-input w-16 text-sm px-2 py-1 bg-dark-accent text-gray-200 border border-accent-blue rounded-md focus:outline-none focus:ring-1 focus:ring-accent-blue" value="${company.rank}" onblur="handleVoteBlur('${company.id}')" onkeydown="handleEnterKey(event, '${company.id}')">
                                </div>
                                <span id="voteDisplay${company.id}" class="font-semibold text-xl text-gray-200 cursor-pointer hover:text-accent-blue transition-colors duration-200" onclick="showVoteInput('${company.id}')">${company.rank}</span>
                            
                                <div class="flex flex-col space-y-1 ml-2">
                                    <button onclick="handleRank('${company.id}', 'promote')" class="text-gray-400 hover:text-accent-green focus:outline-none transition-colors duration-200" title="Promote (Lower Rank Number)">
                                        <i class="fas fa-arrow-up text-sm"></i>
                                    </button>
                                    <button onclick="handleRank('${company.id}', 'demote')" class="text-gray-400 hover:text-accent-red focus:outline-none transition-colors duration-200" title="Demote (Higher Rank Number)">
                                        <i class="fas fa-arrow-down text-sm"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                
                // Create company name cell
                const nameCell = document.createElement('td');
                nameCell.className = 'px-3 py-3 whitespace-nowrap';
                nameCell.innerHTML = `
                    <div class="flex flex-col">
                        <div class="text-sm font-medium">
                            <a href="${company.website}" target="_blank" class="text-accent-blue hover:text-blue-400 transition-colors duration-200">
                                ${company.name}
                            </a>
                        </div>
                    </div>
                `;
                
                // Create founders cell
                const foundersCell = document.createElement('td');
                foundersCell.className = 'px-3 py-3 whitespace-nowrap';
                foundersCell.innerHTML = `
                    <div class="text-xs text-gray-400">
                        ${company.founders.map(founder => `
                            <div>
                                <a href="${founder.linkedin}" target="_blank" class="hover:text-accent-blue transition-colors duration-200">
                                    ${founder.name}
                                </a>
                            </div>
                        `).join('')}
                    </div>
                `;
                
                // Create description cell
                const descriptionCell = document.createElement('td');
                descriptionCell.className = 'px-3 py-3';
                descriptionCell.innerHTML = `
                    <div class="text-xs text-gray-300 max-w-md">
                        ${company.short_description || company.description}
                    </div>
                `;
                
                // Create links cell
                const linksCell = document.createElement('td');
                linksCell.className = 'px-3 py-3 whitespace-nowrap text-xs font-medium';
                linksCell.innerHTML = `
                    <div class="flex space-x-2">
                        <a href="${company.website}" target="_blank" class="text-gray-400 hover:text-accent-blue transition-colors duration-200 flex items-center">
                            <i class="fas fa-globe mr-1"></i> Web
                        </a>
                        ${company.company_linkedin ? `
                            <a href="${company.company_linkedin}" target="_blank" class="text-gray-400 hover:text-accent-blue transition-colors duration-200 flex items-center">
                                <i class="fab fa-linkedin mr-1"></i> LinkedIn
                            </a>
                        ` : ''}
                    </div>
                `;
                
                // Add all cells to the row
                row.appendChild(tierRankCell);
                row.appendChild(nameCell);
                row.appendChild(foundersCell);
                row.appendChild(descriptionCell);
                row.appendChild(linksCell);
                
                // Add the row to the table body
                tableBody.appendChild(row);
            });
            
            // Restore focus if applicable
            if (activeId) {
                const newActiveElement = document.getElementById(activeId);
                if (newActiveElement) {
                    newActiveElement.focus();
                }
            }
            
            // Reset background color after a short delay
            setTimeout(() => {
                tableBody.style.backgroundColor = '';
            }, 300);
            
            // Restore scroll position
            window.scrollTo(0, scrollPosition);
        } else {
            console.error('Error fetching updated companies:', response.statusText);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}