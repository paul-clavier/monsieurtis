import { groupTagsByCategory } from "@/utils/tags";
import type { Tag } from "@monsieurtis/linlin-interfaces/domain/tag.entity";
import { cn } from "@monsieurtis/ui/lib/utils";
import { Link } from "@tanstack/react-router";

interface TagGroupsProps {
    tags: Tag[];
    linked?: boolean;
    className?: string;
}

export const TagGroups = ({ tags, linked, className }: TagGroupsProps) => (
    <div className={cn("tag-groups", className)}>
        {groupTagsByCategory(tags).map((group) => (
            <div key={group.category} className="tag-group">
                <span className="tag-group-label">{group.category}</span>
                <ul className="tag-group-list">
                    {group.tags.map((tag) => (
                        <li key={tag.name}>
                            {linked ? (
                                <Link to="/" search={{ tags: [tag.name] }}>
                                    {tag.name}
                                </Link>
                            ) : (
                                tag.name
                            )}
                        </li>
                    ))}
                </ul>
            </div>
        ))}
    </div>
);
