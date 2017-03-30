import _keyBy from 'lodash.keyby'
import _groupBy from 'lodash.groupby'
import _defaults from 'lodash.defaults'
import _each from 'lodash.foreach'
import axios from 'http'
import L from 'leaflet'

import Map from './map'
import { gameToMapPosX, gameToMapPosY } from './helpers/gameToMapPos'

class Infantry {

    constructor () {
        this.entities = {}
        this.positions = {}
        this.layer
    }

    loadEntities (missionId) {

        return new Promise((resolve, reject) => {
            axios.get(`/infantry/${missionId}`)
                .then(response => {

                    console.log('Infantry: Got infantry', response.data.length);

                    let data = response.data

                    this.entities = _keyBy(data, 'entity_id')

                    resolve()
                })
                .catch(error => {

                    console.error('Infantry: Error fetching mission infantry', error)

                    reject()
                })
        })
    }

    loadPositions (missionId) {

        console.log('loading positions', missionId)

        return new Promise((resolve, reject) => {

            axios.get(`/positions/infantry/${missionId}`)
                .then(response => {

                    console.log('Infantry: Got infantry positions', response.data.length);

                    this.positions = response.data

                    // Pre-map all game points to map points to save processing time later
                    _each(this.positions, timeGroup => {

                        _each(timeGroup, pos => {

                            pos.x = gameToMapPosX(pos.x)
                            pos.y = gameToMapPosY(pos.y)

                        })

                    })

                    resolve()
                })
                .catch(error => {

                    console.error('Infantry: Error fetching infantry positions', error)

                    reject()
                })
        })
    }

    processTime (missionTime) {

        if (this.positions.hasOwnProperty(missionTime)) {

            _each(this.positions[missionTime], posData => {

                this.updateEntityPosition(posData)
            })

        } else {

        }
    }

    updateEntityPosition (posData) {

        // Do we know of this entity? If not ignore
        if (!this.entities.hasOwnProperty(posData.entity_id)) {
            console.warn('Infantry: unknown entity', posData.entity_id)
            return
        }

        let entity = this.entities[posData.entity_id]

        // Has this entity ever been on the map?
        if (!entity.hasOwnProperty('layer'))
            this.addEntityToMap(entity)

        // Has this entity been on the map, but isn't right now?
        if (!this.layer.hasLayer(entity.layer))
            this.layer.addLayer(entity.layer)

        // Update entity position
        entity.layer.setLatLng(Map.rc.unproject([posData.x, posData.y]))

        // Update rotation
        //entity.layer.setRotationAngle(posData.direction);
    }

    addEntityToMap (entity) {

        let entityClass = 'iconMan'
        let entityFaction = 'west'

        // Our unit marker image
        let icon = L.icon(_defaults({
            iconUrl: `${Map.iconMarkerDefaults.iconUrl}/${entityClass}-${entityFaction}.png`
        }, Map.iconMarkerDefaults))

        // Create the marker, we aren't going to add it to the map
        // just yet so the position isn't important
        entity.layer = L.marker([0,0], {
            icon,
            clickable: false,
            rotationAngle: 0,
            rotationOrigin: '50% 50%'
        }).bindTooltip(`${entity.class}`, {
            className: `map__label map__label__infantry`
        })
    }

    initMapLayer () {

        this.layer = new L.LayerGroup()
        this.layer.addTo(Map.handler)
    }

    clearMarkers () {

    }
}

export default new Infantry
