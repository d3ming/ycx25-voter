import pandas as pd
import streamlit as st
import re

def load_and_process_data(file_path):
    """
    Load and process the YC companies data from CSV file.
    Clean and structure the data for the application.
    """
    df = pd.read_csv(file_path)
    
    # Get unique companies
    companies = {}
    for _, row in df.iterrows():
        company_name = row['Company Name']
        if company_name not in companies:
            companies[company_name] = {
                'name': company_name,
                'url': row['Company URL'],
                'description': row['Company Description'],
                'website': row['Company Website'],
                'founders': [],
                'company_linkedin': None
            }
        
        # Check if this row is a founder
        if row['Founder Title'] == 'Founder' or 'Founder' in str(row['Founder Title']) or 'CEO' in str(row['Founder Title']):
            # Check if this is not a duplicate founder
            founder_name = row['Founder Name']
            if founder_name and founder_name not in [f['name'] for f in companies[company_name]['founders']] and founder_name != company_name:
                companies[company_name]['founders'].append({
                    'name': founder_name,
                    'linkedin': row['Founder LinkedIn']
                })
        
        # Capture company LinkedIn URL
        if row['Founder Name'] == company_name and 'linkedin.com/company' in str(row['Founder LinkedIn']):
            companies[company_name]['company_linkedin'] = row['Founder LinkedIn']
    
    # Extract location and founding year from description
    for company_name, company in companies.items():
        # Parse founded year
        founded_match = re.search(r'Founded in (\d{4})', company['description'])
        company['founded_year'] = founded_match.group(1) if founded_match else 'Unknown'
        
        # Parse location
        location_match = re.search(r'based in ([^,\.]+(?:, [^,\.]+)*)', company['description'])
        company['location'] = location_match.group(1).strip() if location_match else 'Unknown'
        
        # Clean up description
        company['short_description'] = company['description'].split('.')[0] + '.'
    
    # Convert to list of companies
    companies_list = list(companies.values())
    
    # Sort by company name
    companies_list.sort(key=lambda x: x['name'])
    
    return companies_list

def initialize_session_data(companies_list):
    """
    Initialize session state for storing user preferences, votes, and notes.
    """
    if 'companies' not in st.session_state:
        st.session_state.companies = companies_list
        
    if 'upvotes' not in st.session_state:
        st.session_state.upvotes = {company['name']: 0 for company in companies_list}
        
    if 'notes' not in st.session_state:
        st.session_state.notes = {company['name']: "" for company in companies_list}
        
    if 'favorites' not in st.session_state:
        st.session_state.favorites = {company['name']: False for company in companies_list}
        
    if 'filters' not in st.session_state:
        st.session_state.filters = {
            'search': '',
            'sort_by': 'Company Name',
            'show_favorites_only': False,
            'has_notes_only': False
        }
