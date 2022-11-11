import {autorun} from 'mobx'
import {sessionClient as AtpApi} from '../third-party/api'
import {RootStoreModel} from './models/root-store'
import * as libapi from './lib/api'
import * as storage from './lib/storage'
import {BUILD} from '../env'

export const DEFAULT_SERVICE =
  BUILD === 'prod'
    ? 'http://localhost:2583' // TODO
    : BUILD === 'staging'
    ? 'https://pds.staging.bsky.dev' // TODO
    : 'http://localhost:2583'
const ROOT_STATE_STORAGE_KEY = 'root'
const STATE_FETCH_INTERVAL = 15e3

export async function setupState() {
  let rootStore: RootStoreModel
  let data: any

  libapi.doPolyfill()

  const api = AtpApi.service(DEFAULT_SERVICE)
  rootStore = new RootStoreModel(api)
  try {
    data = (await storage.load(ROOT_STATE_STORAGE_KEY)) || {}
    rootStore.hydrate(data)
  } catch (e) {
    console.error('Failed to load state from storage', e)
  }

  await rootStore.session.setup()

  // track changes & save to storage
  autorun(() => {
    const snapshot = rootStore.serialize()
    storage.save(ROOT_STATE_STORAGE_KEY, snapshot)
  })

  await rootStore.fetchStateUpdate()
  console.log(rootStore.me)

  // periodic state fetch
  setInterval(() => {
    rootStore.fetchStateUpdate()
  }, STATE_FETCH_INTERVAL)

  return rootStore
}

export {useStores, RootStoreModel, RootStoreProvider} from './models/root-store'
