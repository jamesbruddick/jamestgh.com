$(document).ready(function() {
	$('footer > p:first').text(`Copyright © 2014-${new Date().getFullYear()}`);
});

const locationParam = new URLSearchParams(window.location.search).get('location');

if (!locationParam) {
	if ('geolocation' in navigator) {
		navigator.geolocation.getCurrentPosition(
			(position) => { window.location.assign(`../weather?location=${position.coords.latitude},${position.coords.longitude}`); },
			(error) => { console.error(error); }
		);
	} else {
		console.error('Geolocation is not supported by this browser.');
	}
} else {
	(async () => {

		async function pointsMetadata(coordinates) {
			try {
				const apiResponse = await fetch(`https://api.weather.gov/points/${coordinates[0]},${coordinates[1]}`);
				return apiResponse.ok ? await apiResponse.json() : null;
			} catch (error) {
				console.error(error);
			}
		}

		async function pointActiveAlerts(coordinates) {
			try {
				const apiResponse = await fetch(`https://api.weather.gov/alerts/active?point=${coordinates[0]},${coordinates[1]}`);
				return apiResponse.ok ? await apiResponse.json() : null;
			} catch (error) {
				console.error(error);
			}
		}

		async function areaActiveAlerts(state) {
			try {
				const apiResponse = await fetch(`https://api.weather.gov/alerts/active?area=${state}`);
				return apiResponse.ok ? await apiResponse.json() : null;
			} catch (error) {
				console.error(error);
			}
		}

		async function hazardsMetdata(filename) {
			try {
				const fileResponse = await fetch(filename);
				return fileResponse.ok ? await fileResponse.json() : null;
			} catch (error) {
				console.error(error);
			}
		}

		const wxMetadata = await pointsMetadata(locationParam.split(','));
		const wxPointActiveAlerts = await pointActiveAlerts(locationParam.split(','));
		const wxAreaActiveAlerts = await areaActiveAlerts(wxMetadata.properties.relativeLocation.properties.state);
		const wxHazardsMetadata = await hazardsMetdata('/json/hazardsmetadata.json');

		$(document).ready(function() {
			if (wxPointActiveAlerts) {
				const wxPointActiveFeatures = wxPointActiveAlerts.features;
				if (wxPointActiveFeatures.length && wxHazardsMetadata) {
					wxPointActiveFeatures.forEach((feature) => {
						if (feature.properties.references.length) {
							const formattedDate = new Date(feature.properties.references[0].sent).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric', timeZoneName: 'short' }).replace(',', ' at');
							$('#wx-alerts').append(`
								<div id="alert-${feature.properties.id}" class="bg-black mb-2 p-0">
								  <a class="text-dark text-decoration-none" href="#alert-${feature.properties.id}-description" data-bs-toggle="collapse" aria-expanded="false" aria-controls="alert-${feature.properties.id}-description">
									<h5 class="text-black px-2 py-1 mb-0" style="background-color:${wxHazardsMetadata[feature.properties.event][1]}">${feature.properties.headline}</h5>
								  </a>
								  <p id="alert-${feature.properties.id}-description" class="collapse text-white m-0 px-2 py-1">${feature.properties.description}</p>
								  <div class="bg-dark px-2 py-1">
									<span class="text-white">Originally Issued: ${formattedDate}</span>
								  </div>
								</div>
							`);
						} else {
							$('#wx-alerts').append(`
								<div id="alert-${feature.properties.id}" class="bg-black mb-2 p-0">
								  <a class="text-dark text-decoration-none" href="#alert-${feature.properties.id}-description" data-bs-toggle="collapse" aria-expanded="false" aria-controls="alert-${feature.properties.id}-description">
									<h5 class="text-black px-2 py-1 mb-0" style="background-color:${wxHazardsMetadata[feature.properties.event][1]}">${feature.properties.headline}</h5>
								  </a>
								  <p id="alert-${feature.properties.id}-description" class="collapse text-white m-0 px-2 py-1">${feature.properties.description}</p>
								</div>
							`);
						}
					});
					$('#wx-alerts').before('<hr class="border border-2 my-2">');
					$('#wx-alerts').after('<hr class="border border-2 my-2">');
				}
			}

			if (wxMetadata) {
				const wxRadarStation = wxMetadata.properties.radarStation
				if (wxRadarStation) {
					$('a#radar-image-href').attr('href', `https://radar.weather.gov/ridge/standard/${wxRadarStation}_0.gif`);
					$('img#radar-image').attr({
						src: `https://radar.weather.gov/ridge/standard/${wxRadarStation}_0.gif`,
						alt: `NWS Radar ${wxRadarStation} Latest Image`
					});
					$('a#radar-loop-href').attr('href', `https://radar.weather.gov/ridge/standard/${wxRadarStation}_loop.gif`);
					$('img#radar-loop').attr({
						src: `https://radar.weather.gov/ridge/standard/${wxRadarStation}_loop.gif`,
						alt: `NWS Radar ${wxRadarStation} Latest Image Loop`
					});
				}
			}
		});


		(g=>{let h,a,k,p='The Google Maps JavaScript API',c='google',l='importLibrary',q='__ib__',m=document,b=window;b=b[c]||(b[c]={});let d=b.maps||(b.maps={}),r=new Set,e=new URLSearchParams,u=()=>h||(h=new Promise(async(f,n)=>{await (a=m.createElement('script'));e.set('libraries',[...r]+'');for(k in g)e.set(k.replace(/[A-Z]/g,t=>'_'+t[0].toLowerCase()),g[k]);e.set('callback',c+'.maps.'+q);a.src=`https://maps.${c}apis.com/maps/api/js?`+e;d[q]=f;a.onerror=()=>h=n(Error(p+' could not load.'));a.nonce=m.querySelector('script[nonce]')?.nonce||'';m.head.append(a)}));d[l]?console.warn(p+' only loads once. Ignoring:',g):d[l]=(f,...n)=>r.add(f)&&u().then(()=>d[l](f,...n))})({
			key: 'AIzaSyDm5VY4CT8Ykq8hMZ3nFQfX3wa794HYJ20',
			v: 'weekly'
		});

		let map;

		async function initMap(wxMetadata, wxAreaActiveAlerts, wxHazardsMetadata) {
			if (wxMetadata && wxAreaActiveAlerts && wxHazardsMetadata) {
				const { Map } = await google.maps.importLibrary('maps');
				const coordinates = locationParam.split(',');

				map = new Map(document.getElementById('map'), {
					mapId: '25d6bc5b12d6d547',
					center: { lat: Number(coordinates[0]), lng: Number(coordinates[1]) },
					zoom: 8,
					disableDefaultUI: true,
					zoomControl: true,
					draggable: true
				});

				new google.maps.Marker({
					position: { lat: Number(coordinates[0]), lng: Number(coordinates[1]) },
					icon: {
						path: google.maps.SymbolPath.CIRCLE,
						scale: 8,
						strokeColor: '#FFFFFF',
						strokeWeight: 2,
						fillColor: '#5384ED',
						fillOpacity: 1
					},
					map
				});

				map.data.loadGeoJson(wxAreaActiveAlerts);
				map.data.setStyle((feature) => {
					return {
						strokeColor: '#000000',
						strokeOpacity: 0.5,
						strokeWeight: 1,
						fillColor: wxHazardsMetadata[feature.getProperty('event')][1],
						fillOpacity: 0.4,
						zIndex: -wxHazardsMetadata[feature.getProperty('event')][0]
					};
				});

				wxAreaActiveAlerts.features.forEach(feature => {
					if (!feature.geometry) {
						feature.properties.affectedZones.forEach(affectedZone => {
							let polygonCoordinates = [];
							$.getJSON(affectedZone, (data) => {
								data.geometry.coordinates[0].forEach(coordinate => {
									polygonCoordinates.push({ lat: parseFloat(coordinate[1]), lng: parseFloat(coordinate[0]) });
								});
								new google.maps.Polygon({
									paths: polygonCoordinates,
									strokeColor: '#000000',
									strokeOpacity: 0.5,
									strokeWeight: 1,
									fillColor: wxHazardsMetadata[feature.properties.event][1],
									fillOpacity: 0.25,
									zIndex: -wxHazardsMetadata[feature.properties.event][0],
									map
								});
							});
						});
					}
				});
			}
		};

		initMap(wxMetadata, wxAreaActiveAlerts, wxHazardsMetadata);

	})();
}