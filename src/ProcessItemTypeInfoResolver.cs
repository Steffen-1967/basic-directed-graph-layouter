using System;
using System.Text.Json;
using System.Text.Json.Serialization.Metadata;

namespace Serializer
{
public class ProcessItemTypeInfoResolver : IJsonTypeInfoResolver
{
    private readonly DefaultJsonTypeInfoResolver _defaultResolver = new DefaultJsonTypeInfoResolver();

    public JsonTypeInfo GetTypeInfo(Type type, JsonSerializerOptions options)
    {
        // Delegate all work to the default resolver. This class exists so
        // callers can later add custom behaviour for `ProcessItem` if needed.
        return _defaultResolver.GetTypeInfo(type, options);
    }
}
}