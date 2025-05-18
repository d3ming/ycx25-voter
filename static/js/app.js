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
            
            // Refresh the table to update the sorting order without page refresh
            fetchAndUpdateCompanies();
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
            
            // Refresh the table to update the sorting order without page refresh
            fetchAndUpdateCompanies();
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
    const displayElem = document.getElementById('rankDisplay' + companyId);
    const inputContainer = document.getElementById('rankInputContainer' + companyId);
    const inputElem = document.getElementById('rankInput' + companyId);
    
    if (displayElem && inputContainer && inputElem) {
        displayElem.classList.add('hidden');
        inputContainer.classList.remove('hidden');
        inputElem.focus();
        inputElem.select();
    }
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

// Function to submit vote/rank update
async function submitVote(companyId) {
    try {
        const rankInput = document.getElementById(`rankInput${companyId}`);
        const rankDisplay = document.getElementById(`rankDisplay${companyId}`);
        const inputContainer = document.getElementById(`rankInputContainer${companyId}`);
        
        if (!rankInput || !rankDisplay || !inputContainer) {
            console.error('Could not find rank elements for company', companyId);
            return;
        }
        
        let rankValue = parseInt(rankInput.value, 10);
        
        // Ensure rank is at least 1 (1 is the highest rank)
        if (isNaN(rankValue) || rankValue < 1) {
            rankValue = 1;
        }
        
        // Update display immediately (optimistic update)
        rankDisplay.textContent = rankValue;
        
        // Hide input, show display
        rankDisplay.classList.remove('hidden');
        inputContainer.classList.add('hidden');
        
        // Visual feedback for update
        rankDisplay.style.transition = 'background-color 0.3s';
        rankDisplay.style.backgroundColor = 'rgba(59, 130, 246, 0.3)';
        setTimeout(() => {
            rankDisplay.style.backgroundColor = 'transparent';
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
            
            // Update local data
            const companyIndex = allCompaniesData.findIndex(c => c.id === companyId);
            if (companyIndex !== -1) {
                allCompaniesData[companyIndex].votes = data.votes;
            }
            
            // Re-sort the table without full refresh
            // We don't need to call fetchAndUpdateCompanies() because we just updated our local data
            searchAndFilterCompanies(
                document.getElementById('searchInput')?.value || '',
                document.getElementById('tagFilterSelect')?.value || ''
            );
        } else {
            console.error('Error updating rank:', response.statusText);
            // Visual feedback for error
            rankDisplay.style.backgroundColor = 'rgba(239, 68, 68, 0.3)';
            setTimeout(() => {
                rankDisplay.style.backgroundColor = 'transparent';
            }, 500);
        }
    } catch (error) {
        console.error('Error updating rank:', error);
    }
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

// Collect all unique tags from all companies
function collectAllTags(companies) {
    const tagSet = new Set();
    companies.forEach(company => {
        if (company.tags && Array.isArray(company.tags)) {
            company.tags.forEach(tag => tagSet.add(tag));
        }
    });
    return Array.from(tagSet).sort();
}

// Update tag filter dropdown with all available tags
function updateTagFilterOptions(tags) {
    const tagFilterSelect = document.getElementById('tagFilterSelect');
    if (!tagFilterSelect) return;
    
    // Clear existing options (except the first one)
    while (tagFilterSelect.options.length > 1) {
        tagFilterSelect.remove(1);
    }
    
    // Add options for each tag
    tags.forEach(tag => {
        const option = document.createElement('option');
        option.value = tag;
        option.textContent = tag;
        tagFilterSelect.appendChild(option);
    });
    
    console.log('Updated tag filter dropdown with', tags.length, 'tags');
}

// Add a tag to a company
async function addTag(companyId, tagText) {
    try {
        if (!tagText || !tagText.trim()) return;
        
        // Submit the new tag to the server
        const formData = new FormData();
        formData.append('tag', tagText);
        
        const response = await fetch(`/api/tags/${companyId}`, {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                // Instead of fetching all companies again, update our local data
                // Reload all companies data to get the updated tags
                await loadAllCompaniesData();
                
                // Update the tag dropdown with new tags
                const allTags = collectAllTags(allCompaniesData);
                updateTagFilterOptions(allTags);
                
                // Reapply current filters
                const searchQuery = document.getElementById('searchInput').value;
                const tagFilter = document.getElementById('tagFilterSelect').value;
                searchAndFilterCompanies(searchQuery, tagFilter);
            }
        }
    } catch (error) {
        console.error('Error adding tag:', error);
    }
}

// Remove a tag from a company
async function removeTag(companyId, tagIndex) {
    try {
        const response = await fetch(`/api/tags/${companyId}/${tagIndex}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                // Instead of fetching all companies again, update our local data
                // Reload all companies data to get the updated tags
                await loadAllCompaniesData();
                
                // Update the tag dropdown with current tags
                const allTags = collectAllTags(allCompaniesData);
                updateTagFilterOptions(allTags);
                
                // Reapply current filters
                const searchQuery = document.getElementById('searchInput').value;
                const tagFilter = document.getElementById('tagFilterSelect').value;
                searchAndFilterCompanies(searchQuery, tagFilter);
            }
        }
    } catch (error) {
        console.error('Error removing tag:', error);
    }
}

// Store all companies data in memory for client-side filtering
let allCompaniesData = [];

/**
 * Renders company rows in the table - this function is needed by other parts of the code
 * @param {Array} companies - Array of company objects to render
 * @param {HTMLElement} tableBody - The table body element to render into
 */
function renderCompanyRows(companies, tableBody) {
    if (!tableBody) return;
    
    // Clear the table body
    tableBody.innerHTML = '';
    
    // Handle empty results
    if (companies.length === 0) {
        const noResultsRow = document.createElement('tr');
        noResultsRow.innerHTML = '<td colspan="5" class="px-3 py-5 text-center text-gray-400">No companies match your search criteria</td>';
        tableBody.appendChild(noResultsRow);
        return;
    }
    
    // Add each company to the table
    companies.forEach(company => {
        const row = document.createElement('tr');
        row.className = 'company-row border-b border-dark-border';
        row.dataset.companyId = company.id;
        
        // Create the HTML for the row
        row.innerHTML = `
            <td class="px-3 py-3 whitespace-nowrap">
                <div class="flex items-center space-x-2">
                    <div class="flex items-center flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-3">
                        <!-- Tier dropdown -->
                        <div class="flex items-center">
                            <select id="tierSelect${company.id}" data-company-id="${company.id}" data-original-tier="${company.tier}" class="text-sm w-12 px-1 py-1 bg-dark-accent text-gray-200 border border-dark-border rounded-md focus:outline-none focus:ring-1 focus:ring-accent-blue" onchange="handleTierChange(${company.id}, this.value)">
                                <option value="A" ${company.tier === 'A' ? 'selected' : ''}>A</option>
                                <option value="B" ${company.tier === 'B' ? 'selected' : ''}>B</option>
                                <option value="C" ${company.tier === 'C' ? 'selected' : ''}>C</option>
                                <option value="D" ${company.tier === 'D' ? 'selected' : ''}>D</option>
                            </select>
                        </div>
                        
                        <!-- Rank display/input -->
                        <div class="flex items-center space-x-1">
                            <div id="rankDisplay${company.id}" class="text-sm text-gray-300 w-10 rank-display cursor-pointer" onclick="showVoteInput(${company.id})">
                                ${company.votes}
                            </div>
                            <div id="rankInputContainer${company.id}" class="hidden">
                                <input type="number" id="rankInput${company.id}" class="text-sm w-16 px-1 py-1 bg-dark-accent text-gray-200 border border-dark-border rounded-md focus:outline-none focus:ring-1 focus:ring-accent-blue" value="${company.votes}" min="1" onkeydown="handleEnterKey(event, ${company.id})" onblur="handleVoteBlur(${company.id})">
                            </div>
                            <div class="flex flex-col space-y-1">
                                <button class="text-xs p-1 text-gray-400 hover:text-white" onclick="handleRank(${company.id}, 'up')">▲</button>
                                <button class="text-xs p-1 text-gray-400 hover:text-white" onclick="handleRank(${company.id}, 'down')">▼</button>
                            </div>
                        </div>
                    </div>
                </div>
            </td>
            <td class="px-3 py-3">
                <div class="flex flex-col">
                    <div class="flex items-center">
                        <a href="${company.website || '#'}" target="_blank" class="text-accent-blue hover:underline font-medium">${company.name}</a>
                        ${company.company_linkedin ? `<a href="${company.company_linkedin}" target="_blank" class="ml-2 text-gray-400 hover:text-accent-blue"><i class="fas fa-linkedin"></i></a>` : ''}
                    </div>
                    <div class="text-sm text-gray-400">${company.description || ''}</div>
                    
                    <!-- Tags section -->
                    <div class="flex flex-wrap mt-2 tag-container" data-company-id="${company.id}">
                        ${renderTags(company.tags, company.id)}
                        <button class="add-tag-btn text-xs px-2 py-1 bg-dark-accent text-gray-400 hover:text-gray-200 rounded-md ml-1">
                            <i class="fas fa-plus-circle"></i> Add Tag
                        </button>
                    </div>
                </div>
            </td>
            <td class="px-3 py-3">
                <div class="flex flex-col">
                    ${renderFounders(company.founders)}
                </div>
            </td>

        `;
        
        tableBody.appendChild(row);
    });
}

// Function to load all companies data once
async function loadAllCompaniesData() {
    try {
        const response = await fetch('/api/companies');
        if (response.ok) {
            allCompaniesData = await response.json();
            console.log(`Loaded ${allCompaniesData.length} companies for client-side filtering`);
            return allCompaniesData;
        } else {
            console.error('Error loading companies data:', response.statusText);
            return [];
        }
    } catch (error) {
        console.error('Error loading companies data:', error);
        return [];
    }
}

// Function to search and filter companies on the client side
function searchAndFilterCompanies(query = '', tags = '', tier = '') {
    // If we don't have the data yet, don't filter
    if (allCompaniesData.length === 0) {
        console.log('No companies data available for filtering');
        return;
    }
    
    // Get tier filter value if not provided as argument
    if (!tier) {
        tier = document.getElementById('tierFilterSelect').value;
    }
    
    console.log('Filtering locally with params:', {query, tags, tier});
    query = (query || '').toLowerCase().trim();
    
    // Filter companies based on search and tag criteria
    const filteredCompanies = allCompaniesData.filter(company => {
        // If no filters are applied, include all companies
        if (!query && !tags && !tier) {
            return true;
        }
        
        let matches = true;
        
        // If we have a search query, check if company name or founder matches
        if (query) {
            // Check if company name includes the search query
            const nameMatch = company.name.toLowerCase().includes(query);
            
            // Check if any founder name includes the search query
            let founderMatch = false;
            if (company.founders && Array.isArray(company.founders)) {
                founderMatch = company.founders.some(founder => 
                    founder.name && founder.name.toLowerCase().includes(query)
                );
            }
            
            // Company must match by name OR founder when searching
            if (!nameMatch && !founderMatch) {
                matches = false;
            }
        }
        
        // If we have a tag filter, check if company has the tag
        if (tags && matches) { // Only check tags if company still matches after query filter
            let hasTag = false;
            
            // Parse tags if needed
            if (company.tags) {
                let companyTags = [];
                
                // Handle tags whether they're an array or a JSON string
                if (Array.isArray(company.tags)) {
                    companyTags = company.tags;
                } else if (typeof company.tags === 'string') {
                    try {
                        // Try to parse as JSON
                        companyTags = JSON.parse(company.tags);
                        
                        // If it's not an array after parsing, convert to array
                        if (!Array.isArray(companyTags)) {
                            companyTags = [companyTags];
                        }
                    } catch (e) {
                        // If parsing fails, use as a single string tag
                        console.log('Tags not JSON for company:', company.name, company.tags);
                        if (company.tags.trim()) {
                            companyTags = [company.tags.trim()];
                        }
                    }
                }
                
                // Check if the selected tag is in the company's tags
                if (Array.isArray(companyTags)) {
                    hasTag = companyTags.includes(tags);
                }
            }
            
            // If company doesn't have the tag, exclude it
            if (!hasTag) {
                matches = false;
            }
        }
        
        // If we have a tier filter, check if company matches the tier
        if (tier && matches) { // Only check tier if company still matches after other filters
            if (company.tier !== tier) {
                matches = false;
            }
        }
        
        return matches;
    });
    
    console.log(`Found ${filteredCompanies.length} companies matching criteria`);
    
    // Update the table with filtered data
    const tableBody = document.querySelector('tbody');
    if (tableBody) {
        // Clear the current table
        tableBody.innerHTML = '';
        
        // If no companies match the criteria
        if (filteredCompanies.length === 0) {
            const noResultsRow = document.createElement('tr');
            noResultsRow.innerHTML = '<td colspan="5" class="px-3 py-5 text-center text-gray-400">No companies match your search criteria</td>';
            tableBody.appendChild(noResultsRow);
            return;
        }
        
        // Sort companies by tier (A, B, C, D) then by votes (ascending, lower is better)
        filteredCompanies.sort((a, b) => {
            if (a.tier !== b.tier) {
                // Primary sort: by tier (A, B, C, D)
                return a.tier.localeCompare(b.tier);
            } else {
                // Secondary sort: by votes (lower is better)
                return a.votes - b.votes;
            }
        });
        
        // Add each company to the table
        filteredCompanies.forEach(company => {
            // Create a new row
            const row = document.createElement('tr');
            row.className = 'company-row border-b border-dark-border';
            
            // Create the HTML for this company row
            row.innerHTML = `
                <td class="px-3 py-3 whitespace-nowrap">
                    <div class="flex items-center space-x-2">
                        <div class="flex items-center flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-3">
                            <!-- Tier dropdown -->
                            <div class="flex items-center">
                                <select id="tierSelect${company.id}" data-company-id="${company.id}" data-original-tier="${company.tier}" class="text-sm w-12 px-1 py-1 bg-dark-accent text-gray-200 border border-dark-border rounded-md focus:outline-none focus:ring-1 focus:ring-accent-blue" onchange="handleTierChange(${company.id}, this.value)">
                                    <option value="A" ${company.tier === 'A' ? 'selected' : ''}>A</option>
                                    <option value="B" ${company.tier === 'B' ? 'selected' : ''}>B</option>
                                    <option value="C" ${company.tier === 'C' ? 'selected' : ''}>C</option>
                                    <option value="D" ${company.tier === 'D' ? 'selected' : ''}>D</option>
                                </select>
                            </div>
                            
                            <!-- Rank display/input -->
                            <div class="flex items-center space-x-1">
                                <div id="rankDisplay${company.id}" class="text-sm text-gray-300 w-10 rank-display cursor-pointer" onclick="showVoteInput(${company.id})">
                                    ${company.votes}
                                </div>
                                <div id="rankInputContainer${company.id}" class="hidden">
                                    <input type="number" id="rankInput${company.id}" class="text-sm w-16 px-1 py-1 bg-dark-accent text-gray-200 border border-dark-border rounded-md focus:outline-none focus:ring-1 focus:ring-accent-blue" value="${company.votes}" min="1" onkeydown="handleEnterKey(event, ${company.id})" onblur="handleVoteBlur(${company.id})">
                                </div>
                                <div class="flex flex-col space-y-1">
                                    <button class="text-xs p-1 text-gray-400 hover:text-white" onclick="handleRank(${company.id}, 'up')">▲</button>
                                    <button class="text-xs p-1 text-gray-400 hover:text-white" onclick="handleRank(${company.id}, 'down')">▼</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </td>
                <td class="px-3 py-3">
                    <div class="flex flex-col">
                        <div class="flex items-center">
                            <a href="${company.website || '#'}" target="_blank" class="text-accent-blue hover:underline font-medium">${company.name}</a>
                            ${company.company_linkedin ? `<a href="${company.company_linkedin}" target="_blank" class="ml-2 text-gray-400 hover:text-accent-blue"><i class="fas fa-linkedin"></i></a>` : ''}
                        </div>
                        <div class="text-sm text-gray-400">${company.description || ''}</div>
                        
                        <!-- Tags section -->
                        <div class="flex flex-wrap mt-2 tag-container" data-company-id="${company.id}">
                            ${renderTags(company.tags, company.id)}
                            <button class="add-tag-btn text-xs px-2 py-1 bg-dark-accent text-gray-400 hover:text-gray-200 rounded-md ml-1">
                                <i class="fas fa-plus-circle"></i> Add Tag
                            </button>
                        </div>
                    </div>
                </td>
                <td class="px-3 py-3">
                    <div class="flex flex-col">
                        ${renderFounders(company.founders)}
                    </div>
                </td>
                <td class="px-3 py-3 text-sm text-gray-400">${company.founded_year || ''}</td>
                <td class="px-3 py-3 text-sm text-gray-400">${company.location || ''}</td>
            `;
            
            tableBody.appendChild(row);
        });
    }
}

// Helper function to render founder information
function renderFounders(founders) {
    if (!founders || founders.length === 0) return '';
    
    return founders.map(founder => {
        return `
            <div class="mb-1">
                <span class="text-gray-300">${founder.name}</span>
                ${founder.linkedin ? `<a href="${founder.linkedin}" target="_blank" class="ml-1 text-gray-400 hover:text-accent-blue"><i class="fas fa-linkedin"></i></a>` : ''}
            </div>
        `;
    }).join('');
}

// Helper function to render tags
function renderTags(tags, companyId) {
    // If no tags provided, return empty string
    if (!tags) return '';
    
    // Parse tags if necessary
    let tagsArray = tags;
    if (typeof tags === 'string') {
        try {
            tagsArray = JSON.parse(tags);
        } catch (e) {
            console.error('Error parsing tags for company:', companyId, e);
            // If parsing fails, try to use it as a single tag if non-empty
            if (tags.trim()) {
                tagsArray = [tags.trim()];
            } else {
                return '';
            }
        }
    }
    
    // If no tags or not an array, return empty string
    if (!Array.isArray(tagsArray) || tagsArray.length === 0) return '';
    
    return tagsArray.map((tag, index) => {
        return `
            <div class="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded-md mr-1 mb-1 flex items-center">
                <span>${tag}</span>
                <button class="ml-1 text-gray-400 hover:text-white remove-tag-btn" data-company-id="${companyId}" data-tag-index="${index}" onclick="removeTag(${companyId}, ${index})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    }).join('');
}

// Set up event listeners for tag management when document is loaded
document.addEventListener('DOMContentLoaded', async function() {
    // Load all companies data once for client-side filtering
    try {
        // Load all companies data
        await loadAllCompaniesData();
        
        // Set up tag filter dropdown with all available tags
        const allTags = collectAllTags(allCompaniesData);
        updateTagFilterOptions(allTags);
        
        // Initial rendering of all companies
        searchAndFilterCompanies();
    } catch (error) {
        console.error('Error initializing data:', error);
    }
    // Add tag buttons
    document.addEventListener('click', function(e) {
        if (e.target.closest('.add-tag-btn')) {
            const tagContainer = e.target.closest('.tag-container');
            const companyId = tagContainer.getAttribute('data-company-id');
            
            // Create input for new tag
            const tagInput = document.createElement('input');
            tagInput.type = 'text';
            tagInput.className = 'w-20 px-1 py-1 text-xs bg-dark-accent text-gray-200 border border-accent-blue rounded-md focus:outline-none';
            tagInput.placeholder = 'New tag...';
            
            // Handle tag submission
            tagInput.addEventListener('keydown', async function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const tagText = this.value.trim();
                    if (tagText) {
                        await addTag(companyId, tagText);
                    }
                    this.remove();
                } else if (e.key === 'Escape') {
                    this.remove();
                }
            });
            
            tagInput.addEventListener('blur', function() {
                this.remove();
            });
            
            // Add input before the add button
            e.target.closest('.add-tag-btn').insertAdjacentElement('beforebegin', tagInput);
            tagInput.focus();
        }
    });
    
    // Remove tag buttons
    document.addEventListener('click', function(e) {
        if (e.target.closest('.remove-tag-btn')) {
            const btn = e.target.closest('.remove-tag-btn');
            const tagContainer = btn.closest('.tag-container');
            const companyId = tagContainer.getAttribute('data-company-id');
            const tagIndex = btn.getAttribute('data-tag-index');
            
            removeTag(companyId, tagIndex);
        }
    });
    
    // Debounce function to limit how often a function can be called
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }
    
    // Search input with debouncing (200ms)
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        const debouncedSearch = debounce(function() {
            const tagFilter = document.getElementById('tagFilterSelect').value;
            const tierFilter = document.getElementById('tierFilterSelect').value;
            searchAndFilterCompanies(this.value, tagFilter, tierFilter);
        }, 200);
        
        searchInput.addEventListener('input', function() {
            // Show visual feedback that filtering is happening
            const tableBody = document.querySelector('tbody');
            if (tableBody) {
                tableBody.style.opacity = '0.7';
                setTimeout(() => { tableBody.style.opacity = '1'; }, 150);
            }
            debouncedSearch.call(this);
        });
    }
    
    // Tag filter select
    const tagFilterSelect = document.getElementById('tagFilterSelect');
    if (tagFilterSelect) {
        tagFilterSelect.addEventListener('change', function() {
            const searchQuery = document.getElementById('searchInput').value;
            
            // Show visual feedback
            const tableBody = document.querySelector('tbody');
            if (tableBody) {
                tableBody.style.opacity = '0.7';
                setTimeout(() => { tableBody.style.opacity = '1'; }, 150);
            }
            
            // Client-side filtering is fast, so no need to debounce
            searchAndFilterCompanies(searchQuery, this.value);
        });
    }
    
    // Clear search button
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', function() {
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.value = '';
                const tagFilter = document.getElementById('tagFilterSelect').value;
                searchAndFilterCompanies('', tagFilter);
            }
        });
    }
    
    // Tier filter select
    const tierFilterSelect = document.getElementById('tierFilterSelect');
    if (tierFilterSelect) {
        tierFilterSelect.addEventListener('change', function() {
            const searchQuery = document.getElementById('searchInput').value;
            const tagFilter = document.getElementById('tagFilterSelect').value;
            
            // Show visual feedback
            const tableBody = document.querySelector('tbody');
            if (tableBody) {
                tableBody.style.opacity = '0.7';
                setTimeout(() => { tableBody.style.opacity = '1'; }, 150);
            }
            
            // Apply filtering with the tier filter
            searchAndFilterCompanies(searchQuery, tagFilter, this.value);
        });
    }
    
    // Clear filters button
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', function() {
            const searchInput = document.getElementById('searchInput');
            const tagFilterSelect = document.getElementById('tagFilterSelect');
            const tierFilterSelect = document.getElementById('tierFilterSelect');
            
            if (searchInput) searchInput.value = '';
            if (tagFilterSelect) tagFilterSelect.value = '';
            if (tierFilterSelect) tierFilterSelect.value = '';
            
            // Show visual feedback
            const tableBody = document.querySelector('tbody');
            if (tableBody) {
                tableBody.style.opacity = '0.7';
                setTimeout(() => { tableBody.style.opacity = '1'; }, 150);
            }
            
            // Show all companies (no filters)
            searchAndFilterCompanies('', '', '');
        });
    }
});

// Function to fetch updated companies and refresh the table
async function fetchAndUpdateCompanies() {
    try {
        // Save current scroll position
        const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
        
        // Load all companies data for client-side filtering
        await loadAllCompaniesData();
        
        if (allCompaniesData.length > 0) {
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