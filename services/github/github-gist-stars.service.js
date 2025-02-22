import gql from 'graphql-tag'
import Joi from 'joi'
import { metric } from '../text-formatters.js'
import { NotFound } from '../index.js'
import { GithubAuthV4Service } from './github-auth-service.js'
import { documentation as commonDocumentation } from './github-helpers.js'

const schema = Joi.object({
  data: Joi.object({
    viewer: Joi.object({
      gist: Joi.object({
        stargazerCount: Joi.number().required(),
        url: Joi.string().required(),
        owner: Joi.object({
          login: Joi.string().required(),
        }).required(),
        name: Joi.string().required(),
      }).allow(null),
    }).required(),
  }).required(),
}).required()

const documentation = `${commonDocumentation}
<p>This badge shows the number of stargazers for a gist. Gist id is accepted as input and 'gist not found' is returned if the gist is not found for the given gist id.
</p>`

export default class GithubGistStars extends GithubAuthV4Service {
  static category = 'social'

  static route = {
    base: 'github/stars/gists',
    pattern: ':gistId',
  }

  static examples = [
    {
      title: 'Github Gist stars',
      namedParams: { gistId: '47a4d00457a92aa426dbd48a18776322' },
      staticPreview: {
        label: this.defaultBadgeData.label,
        message: metric(29),
        style: 'social',
      },
      documentation,
    },
  ]

  static defaultBadgeData = {
    label: 'Stars',
    color: 'blue',
    namedLogo: 'github',
  }

  static render({ stargazerCount, url, stargazers }) {
    return { message: metric(stargazerCount), link: [url, stargazers] }
  }

  async fetch({ gistId }) {
    const data = await this._requestGraphql({
      query: gql`
        query ($gistId: String!) {
          viewer {
            gist(name: $gistId) {
              stargazerCount
              url
              name
              owner {
                login
              }
            }
          }
        }
      `,
      variables: {
        gistId,
      },
      schema,
    })
    return data
  }

  static transform({ data }) {
    const {
      data: {
        viewer: { gist },
      },
    } = data

    if (!gist) {
      throw new NotFound({ prettyMessage: 'gist not found' })
    }

    const {
      stargazerCount,
      url,
      name,
      owner: { login },
    } = gist

    const stargazers = `https://gist.github.com/${login}/${name}/stargazers`

    return { stargazerCount, url, stargazers }
  }

  async handle({ gistId }) {
    const data = await this.fetch({ gistId })
    const { stargazerCount, url, stargazers } =
      await this.constructor.transform({
        data,
      })
    return this.constructor.render({ stargazerCount, url, stargazers })
  }
}
