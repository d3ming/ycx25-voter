// Function to handle voting through AJAX
async function handleVote(companyName, voteType) {
    try {
        // Determine the endpoint based on vote type
        const endpoint = voteType === 'up' ? `/upvote/${companyName}` : `/downvote/${companyName}`;
        
        // Get the current vote count element
        const voteDisplayElement = document.getElementById(`voteDisplay${companyName.replace(/\s+/g, '')}`);
        
        // Make API call
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        
        if (response.ok) {
            // Get the updated vote count
            const data = await response.json();
            
            // Update the vote display
            voteDisplayElement.textContent = data.votes;
            
            // Flash effect to show success
            voteDisplayElement.classList.add('vote-updated');
            setTimeout(() => {
                voteDisplayElement.classList.remove('vote-updated');
            }, 500);
        } else {
            console.error('Error updating vote:', response.statusText);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// Function to handle manual vote setting
async function submitVote(companyName) {
    try {
        const voteInput = document.getElementById(`voteInput${companyName}`);
        const voteValue = parseInt(voteInput.value, 10);
        const voteDisplay = document.getElementById(`voteDisplay${companyName}`);
        
        // Make API call to update rank
        const response = await fetch(`/update_rank/${companyName}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            body: `rank=${voteValue}`
        });
        
        if (response.ok) {
            // Get updated data
            const data = await response.json();
            
            // Update display
            voteDisplay.textContent = data.votes;
            
            // Hide input, show display
            voteDisplay.classList.remove('hidden');
            document.getElementById(`voteForm${companyName}`).classList.add('hidden');
            
            // Flash effect
            voteDisplay.classList.add('vote-updated');
            setTimeout(() => {
                voteDisplay.classList.remove('vote-updated');
            }, 500);
        } else {
            console.error('Error updating vote:', response.statusText);
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