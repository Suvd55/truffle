import * as t from "io-ts";
import { withMessage } from "io-ts-types/lib/withMessage";
import * as x from "io-ts-extra";

export type ConfigNetworksType<
  NetworkKind extends string,
  Network extends unknown
> = t.Type<
  {
    [K in NetworkKind]?: {
      [networkName: string]: Network;
    };
  }
>;

export const networksConfig = <
  NetworkKind extends string,
  Network extends unknown
>(options: {
  networkKind: NetworkKind;
  network: t.Type<Network>;
}): ConfigNetworksType<NetworkKind, Network> => {
  const { networkKind, network } = options;

  const networkName = t.string;

  return t.partial({
    [networkKind]: t.record(networkName, network)
  });
};

export type ConfigEnvironmentsType<
  NetworkKind extends string,
  Network extends unknown,
  Environment extends unknown,
  NetworkName extends string
> = t.Type<{
  [environmentName: string]: Environment &
    {
      [K in NetworkKind]?: {
        network: { name: NetworkName } | Network;
      };
    };
}>;

export const environmentsConfig = <
  NetworkKind extends string,
  Network extends unknown,
  Environment extends unknown,
  NetworkName extends string
>(options: {
  networkKind: NetworkKind;
  network: t.Type<Network>;
  environment?: t.Type<Environment>;
  networkName?: t.Type<NetworkName>;
}): ConfigEnvironmentsType<NetworkKind, Network, Environment, NetworkName> => {
  const {
    networkKind,
    network,
    environment = t.unknown as t.Type<Environment>,
    networkName
  } = options;

  const environmentName = t.string;

  const environmentNetworkKind = t.type({
    network: networkName
      ? t.union([
          t.type({
            name: networkName
          }),
          network
        ])
      : network
  });

  return t.record(
    environmentName,
    t.intersection([
      environment,
      t.partial({
        [networkKind]: environmentNetworkKind
      })
    ])
  );
};

export const config = <
  NetworkKind extends string,
  Network extends unknown,
  Environment extends unknown,
  NetworkName extends string
>(options: {
  networkKind: NetworkKind;
  network: t.Type<Network>;
  environment?: t.Type<Environment>;
  networkName?: t.Type<NetworkName>;
}) => {
  const { networkKind } = options;

  const configType = t.partial({
    networks: networksConfig(options),

    // first allow any network name
    environments: environmentsConfig({
      ...options,
      networkName: t.string
    })
  });

  return x.narrow(configType, config => {
    const { networks: { [networkKind]: networks = {} as any } = {} } = config;
    const networkNames = Object.keys(networks);
    const networkName =
      networkNames.length === 0
        ? undefined
        : networkNames.length === 1
        ? // @ts-ignore since this will always exist
          (t.literal(networkNames[0]) as t.LiteralC<string>)
        : // @ts-ignore to ignore io-ts's confusion here
          t.union(networkNames.map(t.literal) as t.LiteralC<string>[]);

    return withMessage(
      t.partial({
        environments: networkName
          ? environmentsConfig({
              ...options,
              networkName
            })
          : environmentsConfig(options)
      }),
      () => "Invalid network reference"
    );
  });
};
