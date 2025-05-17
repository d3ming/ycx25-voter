import streamlit as st
from urllib.parse import quote

def upvote_company(company_name):
    """Upvote a company and update session state"""
    st.session_state.upvotes[company_name] += 1

def toggle_favorite(company_name):
    """Toggle favorite status for a company"""
    st.session_state.favorites[company_name] = not st.session_state.favorites[company_name]

def update_note(company_name, note):
    """Update note for a company"""
    st.session_state.notes[company_name] = note

def get_sorted_companies():
    """Return sorted and filtered companies based on current filters"""
    companies = st.session_state.companies.copy()
    
    # Apply search filter
    if st.session_state.filters['search']:
        search_term = st.session_state.filters['search'].lower()
        companies = [
            company for company in companies 
            if search_term in company['name'].lower() or 
               search_term in company['description'].lower() or
               any(search_term in founder['name'].lower() for founder in company['founders'])
        ]
    
    # Apply favorites filter
    if st.session_state.filters['show_favorites_only']:
        companies = [
            company for company in companies 
            if st.session_state.favorites[company['name']]
        ]
    
    # Apply notes filter
    if st.session_state.filters['has_notes_only']:
        companies = [
            company for company in companies 
            if st.session_state.notes[company['name']]
        ]
    
    # Apply sorting
    sort_by = st.session_state.filters['sort_by']
    if sort_by == 'Company Name':
        companies.sort(key=lambda x: x['name'])
    elif sort_by == 'Upvotes (High to Low)':
        companies.sort(key=lambda x: st.session_state.upvotes[x['name']], reverse=True)
    elif sort_by == 'Upvotes (Low to High)':
        companies.sort(key=lambda x: st.session_state.upvotes[x['name']])
    elif sort_by == 'Founded Year (Newest First)':
        companies.sort(key=lambda x: x['founded_year'] if x['founded_year'] != 'Unknown' else '0', reverse=True)
    elif sort_by == 'Founded Year (Oldest First)':
        companies.sort(key=lambda x: x['founded_year'] if x['founded_year'] != 'Unknown' else '9999')
    
    return companies

def generate_mail_link(company):
    """Generate a mailto link with company info"""
    subject = f"Interested in {company['name']}"
    body = f"""Hi,

I came across {company['name']} and I'm interested in learning more about your company.

Best regards,
[Your Name]"""
    
    mail_link = f"mailto:?subject={quote(subject)}&body={quote(body)}"
    return mail_link

def get_company_stats():
    """Get statistics about companies, upvotes, and notes"""
    total_companies = len(st.session_state.companies)
    favorited_companies = sum(1 for favorited in st.session_state.favorites.values() if favorited)
    companies_with_notes = sum(1 for note in st.session_state.notes.values() if note)
    most_upvoted = max(st.session_state.upvotes.items(), key=lambda x: x[1]) if st.session_state.upvotes else ('None', 0)
    
    return {
        'total': total_companies,
        'favorited': favorited_companies,
        'with_notes': companies_with_notes,
        'most_upvoted': most_upvoted
    }
