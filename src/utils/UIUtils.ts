import { API_URL } from '../services/ApiService'

export const showEnvironmentBadge = () => {
	const env = API_URL.includes('localhost')
		? 'DEV'
		: API_URL.includes('staging')
		? 'STAGING'
		: 'PROD'

	const badge = document.createElement('div')
	badge.textContent = env
	badge.style.position = 'fixed'
	badge.style.bottom = '10px'
	badge.style.right = '10px'
	badge.style.padding = '5px 10px'
	badge.style.borderRadius = '4px'
	badge.style.fontSize = '12px'
	badge.style.fontWeight = 'bold'
	badge.style.color = 'white'
	badge.style.backgroundColor =
		env === 'PROD' ? '#dc3545' : env === 'STAGING' ? '#fd7e14' : '#28a745'
	badge.style.zIndex = '10000'
	document.body.appendChild(badge)
}
